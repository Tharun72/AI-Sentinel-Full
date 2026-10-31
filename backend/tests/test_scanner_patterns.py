import tempfile
import unittest
from pathlib import Path

from app.scanners.scanner import SecurityScanner


class ScannerPatternTests(unittest.TestCase):
    def test_detects_supported_patterns_and_redacts_secret_evidence(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as directory:
            source = Path(directory) / "example.py"
            source.write_text(
                "api_key = 'not-for-storage'\n"
                "query = 'SELECT * FROM users WHERE id=' + user_input\n"
                "subprocess.run(command, shell=True)\n"
                "payload = pickle.loads(request.body)\n"
                "file = open(request.args['path'])\n"
                "digest = hashlib.md5(value).hexdigest()\n",
                encoding="utf-8",
            )
            results = SecurityScanner().scan(directory)

        findings = {item["type"]: item for item in results["vulnerabilities"]}
        self.assertTrue({
            "Hardcoded Secret Key", "SQL Injection", "Command Injection",
            "Unsafe Deserialization", "Potential Path Traversal", "Weak Cryptography",
        }.issubset(findings))
        self.assertIn("[REDACTED]", findings["Hardcoded Secret Key"]["evidence"])
        self.assertNotIn("not-for-storage", findings["Hardcoded Secret Key"]["evidence"])

    def test_binary_and_generated_files_are_not_scanned(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as directory:
            root = Path(directory)
            (root / "binary.py").write_bytes(b"\x00api_key = 'ignored'")
            (root / "bundle.min.js").write_text("const password = 'ignored'", encoding="utf-8")
            results = SecurityScanner().scan(directory)
        self.assertEqual(results["files_discovered"], 1)
        self.assertEqual(results["vulnerabilities_found"], 0)


if __name__ == "__main__":
    unittest.main()
