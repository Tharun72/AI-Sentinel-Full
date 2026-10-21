from app.ai.ollama_service import analyze_vulnerability


result = analyze_vulnerability(
    vulnerability_type="SQL Injection",
    file_path="security_test.py",
    line_number=8,
    severity="critical",
    cvss=9.0,
)

print("\nAI RESULT:\n")
print(result)