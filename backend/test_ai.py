from app.ai.ollama_service import analyze_vulnerability

result = analyze_vulnerability(
    vulnerability_type="SQL Injection",
    file_path="security_test.py",
    line_number=8,
    severity="critical",
    cvss=9.0,
    vulnerable_code='query = "SELECT * FROM users WHERE name = \'" + username + "\'"',
)

print("\nAI RESULT:\n")
print(result)