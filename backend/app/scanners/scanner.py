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
    """Pattern scanner that never executes repository source or needs AI."""

    ignored_directories = {
        ".git", "node_modules", "venv", ".venv", "__pycache__", "dist", "build",
        ".idea", ".vscode", "coverage", ".pytest_cache", ".mypy_cache", ".tox",
        ".next", ".cache", "vendor", "target", "out",
    }
    allowed_extensions = {
        ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".cpp", ".c", ".h", ".hpp",
        ".go", ".rs", ".php", ".rb", ".json", ".yaml", ".yml", ".env", ".txt", ".md",
        ".toml", ".ini", ".cfg", ".conf", ".xml", ".html", ".css", ".properties", ".cs",
    }
    ignored_file_names = {"package-lock.json", "yarn.lock", "pnpm-lock.yaml", "composer.lock", "cargo.lock"}

    patterns = {
        "Hardcoded AWS Access Key": {
            "pattern": re.compile(r"AKIA[0-9A-Z]{16}"), "severity": "critical", "cvss": 9.8,
            "description": "An AWS access key appears to be hardcoded inside the source code.",
            "recommendation": "Remove the credential from source code, rotate it, and use a secrets manager.",
        },
        "Hardcoded Secret Key": {
            "pattern": re.compile(r"(secret_key|secret|api_key|apikey|password|token)\s*[:=]\s*['\"][^'\"]+['\"]", re.IGNORECASE),
            "severity": "high", "cvss": 8.0,
            "description": "A hardcoded credential or secret was detected inside the source code.",
            "recommendation": "Move secrets into environment variables or a secrets manager and rotate exposed values.",
        },
        "Private Key": {
            "pattern": re.compile(r"-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----"), "severity": "critical", "cvss": 9.8,
            "description": "A private cryptographic key was found in the source repository.",
            "recommendation": "Remove and rotate the key; store it in an approved secret store.",
        },
        "Hardcoded Database URL": {
            "pattern": re.compile(r"(postgresql|mysql|mongodb)://[^'\"]+", re.IGNORECASE), "severity": "high", "cvss": 8.0,
            "description": "A database connection URL containing potential credentials was detected.",
            "recommendation": "Store connection strings in environment variables or a secrets manager.",
        },
        "SQL Injection": {
            "pattern": re.compile(r"(SELECT|INSERT|UPDATE|DELETE).*(\+|f['\"]|format\(|%s)", re.IGNORECASE), "severity": "critical", "cvss": 9.0,
            "description": "SQL query construction appears to incorporate user-controlled input directly.",
            "recommendation": "Use parameterized queries or prepared statements instead of string concatenation.",
        },
        "Command Injection": {
            "pattern": re.compile(r"(?:subprocess\.(?:run|call|Popen|check_output).*shell\s*=\s*True|(?:os\.system|child_process\.(?:exec|execSync))\s*\()", re.IGNORECASE),
            "severity": "high", "cvss": 8.1,
            "description": "A shell command execution API was detected and may permit command injection.",
            "recommendation": "Avoid shell invocation; pass a fixed executable and an argument array after strict allowlist validation.",
        },
        "Unsafe Deserialization": {
            "pattern": re.compile(r"(?:pickle\.(?:load|loads)|yaml\.load\s*\(|marshal\.loads\s*\()", re.IGNORECASE),
            "severity": "high", "cvss": 8.1,
            "description": "An unsafe deserialization API was detected.",
            "recommendation": "Do not deserialize untrusted input; use a safe schema-validated format and SafeLoader where applicable.",
        },
        "Potential Path Traversal": {
            "pattern": re.compile(r"(?:open|send_file|send_from_directory|readFile|readFileSync)\s*\([^\n]*(?:request\.|req\.(?:query|params|body))", re.IGNORECASE),
            "severity": "high", "cvss": 7.5,
            "description": "A file access API appears to consume request-controlled data.",
            "recommendation": "Resolve paths under a fixed base directory, reject traversal segments, and enforce an allowlist.",
        },
        "Weak Cryptography": {
            "pattern": re.compile(r"(?:hashlib\.(?:md5|sha1)\s*\(|createHash\s*\(\s*['\"](?:md5|sha1)['\"]|(?:DES|AES)\s*\.\s*MODE_ECB)", re.IGNORECASE),
            "severity": "medium", "cvss": 5.9,
            "description": "A weak or unsafe cryptographic primitive or mode was detected.",
            "recommendation": "Use modern authenticated encryption and SHA-256 or stronger algorithms appropriate to the use case.",
        },
    }

    @staticmethod
    def _check_deadline(deadline: float | None) -> None:
        if deadline is not None and time.monotonic() >= deadline:
            raise ScanDeadlineExceeded("The scan exceeded its total time limit.")

    def _is_eligible(self, file_path: Path) -> bool:
        if file_path.name in self.ignored_file_names or file_path.name.endswith(".min.js") or file_path.name.endswith(".map"):
            return False
        return file_path.name == ".env" or file_path.suffix.lower() in self.allowed_extensions

    def _discover_files(self, root: Path, deadline: float | None) -> list[Path]:
        candidates: list[Path] = []
        for directory, directory_names, file_names in os.walk(root):
            self._check_deadline(deadline)
            directory_names[:] = [name for name in directory_names if name not in self.ignored_directories]
            directory_path = Path(directory)
            for file_name in file_names:
                self._check_deadline(deadline)
                file_path = directory_path / file_name
                if not self._is_eligible(file_path) or file_path.is_symlink():
                    continue
                try:
                    if file_path.stat().st_size > settings.SCAN_MAX_FILE_SIZE_BYTES:
                        continue
                except OSError:
                    continue
                candidates.append(file_path)
                if len(candidates) > settings.SCAN_MAX_FILES:
                    raise ScanLimitExceeded(f"Repository exceeds the {settings.SCAN_MAX_FILES} eligible-file limit.")
        return candidates

    @staticmethod
    def _evidence(line: str) -> str:
        """Keep useful proof while avoiding persistence of values that look secret."""

        line = re.sub(r"AKIA[0-9A-Z]{16}", "[REDACTED_AWS_ACCESS_KEY]", line)
        line = re.sub(
            r"(?i)((?:secret(?:_key)?|api_?key|password|token)\s*[:=]\s*['\"])[^'\"]+(['\"])",
            r"\1[REDACTED]\2", line,
        )
        line = re.sub(r"(?i)(://)[^/@\s]+@", r"\1[REDACTED]@", line)
        return line.strip()[:500]

    def scan(self, repository_path: str, *, progress_callback: ProgressCallback | None = None, deadline: float | None = None) -> dict:
        """Scan eligible text files once and report actual discovery/processing events."""

        root = Path(repository_path)
        if not root.exists():
            raise FileNotFoundError(f"Repository path does not exist: {repository_path}")
        candidates = self._discover_files(root, deadline)
        files_discovered = len(candidates)
        if progress_callback:
            progress_callback(files_discovered, 0, None)

        findings: dict[tuple[str, str, int], dict] = {}
        for files_processed, file_path in enumerate(candidates, start=1):
            self._check_deadline(deadline)
            relative_name = file_path.relative_to(root).as_posix()
            if progress_callback:
                progress_callback(files_discovered, files_processed - 1, relative_name)
            try:
                raw_content = file_path.read_bytes()
                if b"\x00" in raw_content:
                    continue
                content = raw_content.decode("utf-8")
            except (OSError, UnicodeDecodeError):
                if progress_callback:
                    progress_callback(files_discovered, files_processed, None)
                continue

            lines = content.splitlines()
            for vulnerability_name, metadata in self.patterns.items():
                pattern = metadata["pattern"]
                for line_number, line in enumerate(lines, start=1):
                    self._check_deadline(deadline)
                    matches = pattern.findall(line)
                    if not matches:
                        continue
                    key = (vulnerability_name, relative_name, line_number)
                    context_start = max(0, line_number - 2)
                    context_end = min(len(lines), line_number + 1)
                    context = "\n".join(
                        f"{index + 1}: {self._evidence(context_line)}"
                        for index, context_line in enumerate(lines[context_start:context_end], start=context_start)
                    )
                    findings[key] = {
                        "type": vulnerability_name, "file": relative_name, "line_number": line_number,
                        "count": len(matches), "severity": metadata["severity"], "cvss": metadata["cvss"],
                        "description": metadata["description"], "recommendation": metadata["recommendation"],
                        "evidence": self._evidence(line), "code": context,
                    }
            if progress_callback:
                progress_callback(files_discovered, files_processed, None)

        vulnerabilities = list(findings.values())
        vulnerabilities_found = sum(item["count"] for item in vulnerabilities)
        highest_cvss = max((item.get("cvss", 0.0) for item in vulnerabilities), default=0.0)
        risk_score = 0.0 if not vulnerabilities_found else (9.0 if highest_cvss >= 9.0 else 7.0 if highest_cvss >= 7.0 else 4.0 if highest_cvss >= 4.0 else 1.0)
        return {
            "files_discovered": files_discovered, "files_scanned": files_discovered,
            "files_processed": files_discovered, "vulnerabilities_found": vulnerabilities_found,
            "risk_score": risk_score, "vulnerabilities": vulnerabilities,
        }
