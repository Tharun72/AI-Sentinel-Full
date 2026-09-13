from pathlib import Path
import re


class SecurityScanner:

    def scan(self, repository_path: str) -> dict:
        """
        Perform a static security scan on a local repository.
        Detect vulnerabilities and provide security metadata.
        """

        path = Path(repository_path)

        if not path.exists():
            raise FileNotFoundError(
                f"Repository path does not exist: {repository_path}"
            )

        files_scanned = 0
        vulnerabilities = []

        # ---------------------------------------------------------
        # Directories that should never be scanned
        # ---------------------------------------------------------

        ignored_directories = {
            ".git",
            "node_modules",
            "venv",
            ".venv",
            "__pycache__",
            "dist",
            "build",
            ".idea",
            ".vscode",
            "coverage",
            ".pytest_cache",
        }

        # ---------------------------------------------------------
        # File extensions that we want to scan
        # ---------------------------------------------------------

        allowed_extensions = {
            ".py",
            ".js",
            ".ts",
            ".tsx",
            ".jsx",
            ".java",
            ".cpp",
            ".c",
            ".h",
            ".hpp",
            ".go",
            ".rs",
            ".php",
            ".rb",
            ".json",
            ".yaml",
            ".yml",
            ".env",
            ".txt",
            ".md",
            ".toml",
            ".ini",
            ".cfg",
            ".conf",
            ".xml",
            ".html",
            ".css",
            ".properties",
        }

        # ---------------------------------------------------------
        # Security detection patterns
        # ---------------------------------------------------------

        patterns = {

            "Hardcoded AWS Access Key": {
                "pattern": re.compile(
                    r"AKIA[0-9A-Z]{16}"
                ),
                "severity": "critical",
                "cvss": 9.8,
                "description": (
                    "An AWS access key appears to be hardcoded "
                    "inside the source code."
                ),
                "recommendation": (
                    "Remove the credential from the source code "
                    "and store it securely using environment "
                    "variables or a secrets manager."
                ),
            },

            "Hardcoded Secret Key": {
                "pattern": re.compile(
                    r"(secret_key|secret|api_key|apikey|password|token)"
                    r"\s*[:=]\s*['\"][^'\"]+['\"]",
                    re.IGNORECASE,
                ),
                "severity": "high",
                "cvss": 8.0,
                "description": (
                    "A hardcoded credential or secret was detected "
                    "inside the source code."
                ),
                "recommendation": (
                    "Move secrets into environment variables or "
                    "a secure secrets manager and rotate exposed "
                    "credentials."
                ),
            },

            "Private Key": {
                "pattern": re.compile(
                    r"-----BEGIN "
                    r"(RSA |EC |OPENSSH )?"
                    r"PRIVATE KEY-----"
                ),
                "severity": "critical",
                "cvss": 9.8,
                "description": (
                    "A private cryptographic key was found in "
                    "the source repository."
                ),
                "recommendation": (
                    "Remove the private key from the repository, "
                    "rotate it immediately, and store it securely."
                ),
            },

            "Hardcoded Database URL": {
                "pattern": re.compile(
                    r"(postgresql|mysql|mongodb)"
                    r"://[^'\"]+",
                    re.IGNORECASE,
                ),
                "severity": "high",
                "cvss": 8.0,
                "description": (
                    "A database connection URL containing "
                    "potential credentials was detected."
                ),
                "recommendation": (
                    "Store database connection strings in "
                    "environment variables or a secure secrets manager."
                ),
            },

            "SQL Injection": {
                "pattern": re.compile(
                    r"(SELECT|INSERT|UPDATE|DELETE)"
                    r".*(\+|f['\"]|format\(|%s)",
                    re.IGNORECASE,
                ),
                "severity": "critical",
                "cvss": 9.0,
                "description": (
                    "SQL query construction appears to incorporate "
                    "user-controlled input directly."
                ),
                "recommendation": (
                    "Use parameterized queries or prepared statements "
                    "instead of constructing SQL using string concatenation."
                ),
            },
        }

        # ---------------------------------------------------------
        # Scan repository recursively
        # ---------------------------------------------------------

        for file_path in path.rglob("*"):

            if not file_path.is_file():
                continue

            # Ignore unwanted directories
            if any(
                directory in ignored_directories
                for directory in file_path.parts
            ):
                continue

            # Check file extension
            if file_path.suffix.lower() not in allowed_extensions:
                continue

            try:
                content = file_path.read_text(
                    encoding="utf-8",
                    errors="ignore",
                )
            except Exception:
                continue

            files_scanned += 1

            # -----------------------------------------------------
            # Check every security pattern
            # -----------------------------------------------------

            for vulnerability_name, metadata in patterns.items():

                pattern = metadata["pattern"]

                # Search line-by-line so we can report line numbers
                for line_number, line in enumerate(
                    content.splitlines(),
                    start=1,
                ):

                    matches = pattern.findall(line)

                    if not matches:
                        continue

                    vulnerabilities.append({
                        "type": vulnerability_name,

                        "file": str(
                            file_path.relative_to(path)
                        ),

                        "line_number": line_number,

                        "count": len(matches),

                        "severity": metadata["severity"],

                        "cvss": metadata["cvss"],

                        "description": metadata["description"],

                        "recommendation": metadata["recommendation"],

                        # Actual vulnerable source code
                        "code": line.strip(),
                    })

        # ---------------------------------------------------------
        # Calculate total vulnerabilities
        # ---------------------------------------------------------

        vulnerabilities_found = sum(
            item["count"]
            for item in vulnerabilities
        )

        # ---------------------------------------------------------
        # Calculate risk score
        # ---------------------------------------------------------

# Calculate risk score based on highest CVSS severity
        if vulnerabilities_found == 0:
            risk_score = 0.0
        else:
            highest_cvss = max(
                item.get("cvss", 0.0)
                for item in vulnerabilities
            )

            if highest_cvss >= 9.0:
                risk_score = 9.0
            elif highest_cvss >= 7.0:
                risk_score = 7.0
            elif highest_cvss >= 4.0:
                risk_score = 4.0
            else:
                risk_score = 1.0

        # ---------------------------------------------------------
        # Return scan results
        # ---------------------------------------------------------

        return {
            "files_scanned": files_scanned,
            "vulnerabilities_found": vulnerabilities_found,
            "risk_score": risk_score,
            "vulnerabilities": vulnerabilities,
        }