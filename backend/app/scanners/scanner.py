"""Deterministic repository scanner with bounded traversal and live events."""

from __future__ import annotations

import os
import re
import time
from collections.abc import Callable
from pathlib import Path

from app.core.config import settings


class ScanLimitExceeded(RuntimeError):
    """Raised when an explicit repository scanning limit is exceeded."""


class ScanDeadlineExceeded(TimeoutError):
    """Raised when a scan has consumed its configured wall-clock budget."""


ProgressCallback = Callable[[int, int, str | None], None]


class SecurityScanner:
    """Pattern scanner that never requires AI availability to finish."""

    ignored_directories = {
        ".git", "node_modules", "venv", ".venv", "__pycache__", "dist",
        "build", ".idea", ".vscode", "coverage", ".pytest_cache", ".mypy_cache",
        ".tox", ".next", ".cache", "vendor",
    }
    allowed_extensions = {
        ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".cpp", ".c", ".h",
        ".hpp", ".go", ".rs", ".php", ".rb", ".json", ".yaml", ".yml",
        ".env", ".txt", ".md", ".toml", ".ini", ".cfg", ".conf", ".xml",
        ".html", ".css", ".properties",
    }

    patterns = {
        "Hardcoded AWS Access Key": {
            "pattern": re.compile(r"AKIA[0-9A-Z]{16}"),
            "severity": "critical", "cvss": 9.8,
            "description": "An AWS access key appears to be hardcoded inside the source code.",
            "recommendation": "Remove the credential from source code and store it in environment variables or a secrets manager.",
        },
        "Hardcoded Secret Key": {
            "pattern": re.compile(r"(secret_key|secret|api_key|apikey|password|token)\s*[:=]\s*['\"][^'\"]+['\"]", re.IGNORECASE),
            "severity": "high", "cvss": 8.0,
            "description": "A hardcoded credential or secret was detected inside the source code.",
            "recommendation": "Move secrets into environment variables or a secure secrets manager and rotate exposed credentials.",
        },
        "Private Key": {
            "pattern": re.compile(r"-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----"),
            "severity": "critical", "cvss": 9.8,
            "description": "A private cryptographic key was found in the source repository.",
            "recommendation": "Remove the private key from the repository, rotate it immediately, and store it securely.",
        },
        "Hardcoded Database URL": {
            "pattern": re.compile(r"(postgresql|mysql|mongodb)://[^'\"]+", re.IGNORECASE),
            "severity": "high", "cvss": 8.0,
            "description": "A database connection URL containing potential credentials was detected.",
            "recommendation": "Store database connection strings in environment variables or a secure secrets manager.",
        },
        "SQL Injection": {
            "pattern": re.compile(r"(SELECT|INSERT|UPDATE|DELETE).*(\+|f['\"]|format\(|%s)", re.IGNORECASE),
            "severity": "critical", "cvss": 9.0,
            "description": "SQL query construction appears to incorporate user-controlled input directly.",
            "recommendation": "Use parameterized queries or prepared statements instead of constructing SQL with string concatenation.",
        },
    }

    @staticmethod
    def _check_deadline(deadline: float | None) -> None:
        if deadline is not None and time.monotonic() >= deadline:
            raise ScanDeadlineExceeded("The scan exceeded its total time limit.")

    def _discover_files(self, root: Path, deadline: float | None) -> list[Path]:
        candidates: list[Path] = []
        for directory, directory_names, file_names in os.walk(root):
            self._check_deadline(deadline)
            directory_names[:] = [
                name for name in directory_names if name not in self.ignored_directories
            ]
            directory_path = Path(directory)
            for file_name in file_names:
                self._check_deadline(deadline)
                file_path = directory_path / file_name
                if file_path.suffix.lower() not in self.allowed_extensions:
                    continue
                try:
                    if file_path.stat().st_size > settings.SCAN_MAX_FILE_SIZE_BYTES:
                        continue
                except OSError:
                    continue
                candidates.append(file_path)
                if len(candidates) > settings.SCAN_MAX_FILES:
                    raise ScanLimitExceeded(
                        f"Repository exceeds the {settings.SCAN_MAX_FILES} eligible-file limit."
                    )
        return candidates

    def scan(
        self,
        repository_path: str,
        *,
        progress_callback: ProgressCallback | None = None,
        deadline: float | None = None,
    ) -> dict:
        """Scan eligible files once and report actual discovery/processing events."""

        root = Path(repository_path)
        if not root.exists():
            raise FileNotFoundError(f"Repository path does not exist: {repository_path}")

        candidates = self._discover_files(root, deadline)
        files_discovered = len(candidates)
        if progress_callback:
            progress_callback(files_discovered, 0, None)

        vulnerabilities: list[dict] = []
        for files_processed, file_path in enumerate(candidates, start=1):
            self._check_deadline(deadline)
            relative_path = file_path.relative_to(root)
            relative_name = str(relative_path)
            if progress_callback:
                progress_callback(files_discovered, files_processed - 1, relative_name)
            try:
                content = file_path.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                if progress_callback:
                    progress_callback(files_discovered, files_processed, None)
                continue

            lines = content.splitlines()
            for vulnerability_name, metadata in self.patterns.items():
                pattern = metadata["pattern"]
                for line_number, line in enumerate(lines, start=1):
                    matches = pattern.findall(line)
                    if not matches:
                        continue
                    context_start = max(0, line_number - 2)
                    context_end = min(len(lines), line_number + 1)
                    code_context = "\n".join(
                        f"{index + 1}: {context_line}"
                        for index, context_line in enumerate(
                            lines[context_start:context_end], start=context_start
                        )
                    )
                    vulnerabilities.append({
                        "type": vulnerability_name,
                        "file": relative_name,
                        "line_number": line_number,
                        "count": len(matches),
                        "severity": metadata["severity"],
                        "cvss": metadata["cvss"],
                        "description": metadata["description"],
                        "recommendation": metadata["recommendation"],
                        # Source context is only used in-memory for optional AI.
                        "code": code_context,
                    })
            if progress_callback:
                progress_callback(files_discovered, files_processed, None)

        vulnerabilities_found = sum(item["count"] for item in vulnerabilities)
        highest_cvss = max((item.get("cvss", 0.0) for item in vulnerabilities), default=0.0)
        # ``risk_score`` is a 0-9 tier based on the highest detected CVSS;
        # it is not a percentage and the UI labels it accordingly.
        risk_score = 0.0 if not vulnerabilities_found else (
            9.0 if highest_cvss >= 9.0 else 7.0 if highest_cvss >= 7.0 else
            4.0 if highest_cvss >= 4.0 else 1.0
        )
        return {
            "files_discovered": files_discovered,
            "files_scanned": files_discovered,
            "files_processed": files_discovered,
            "vulnerabilities_found": vulnerabilities_found,
            "risk_score": risk_score,
            "vulnerabilities": vulnerabilities,
        }
