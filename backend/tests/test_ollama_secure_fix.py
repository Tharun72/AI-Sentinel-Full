import unittest
from unittest.mock import Mock, patch

import requests

from app.ai.ollama_service import generate_secure_fix_patch


class OllamaSecureFixTests(unittest.TestCase):
    def test_timeout_is_reported_without_a_proposal(self):
        with patch("app.ai.ollama_service.requests.post", side_effect=requests.Timeout()):
            with self.assertRaisesRegex(TimeoutError, "timed out"):
                generate_secure_fix_patch("SQL Injection", "app.py", 1, None, None, "query = input")

    def test_missing_model_is_reported_without_a_proposal(self):
        response = Mock(status_code=404)
        error = requests.HTTPError(response=response)
        with patch("app.ai.ollama_service.requests.post", side_effect=error):
            with self.assertRaisesRegex(ValueError, "configured AI model is unavailable"):
                generate_secure_fix_patch("SQL Injection", "app.py", 1, None, None, "query = input")

    def test_empty_model_response_is_rejected(self):
        response = Mock()
        response.raise_for_status.return_value = None
        response.json.return_value = {"response": ""}
        with patch("app.ai.ollama_service.requests.post", return_value=response):
            with self.assertRaisesRegex(ValueError, "invalid response"):
                generate_secure_fix_patch("SQL Injection", "app.py", 1, None, None, "query = input")


if __name__ == "__main__":
    unittest.main()
