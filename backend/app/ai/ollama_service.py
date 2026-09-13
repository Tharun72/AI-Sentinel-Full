import json
import requests

from app.core.config import settings


def analyze_vulnerability(
    vulnerability_type: str,
    file_path: str,
    line_number: int | None,
    severity: str | None,
    cvss: float | None,
    vulnerable_code: str | None = None,
) -> dict:

    prompt = f"""
You are a senior application security engineer.

Analyze the following security vulnerability.

Vulnerability Type: {vulnerability_type}
File: {file_path}
Line: {line_number}
Severity: {severity}
CVSS: {cvss}

Vulnerable Code:
{vulnerable_code or "Source code not available."}

Return ONLY valid JSON with exactly these fields:

{{
  "explanation": "Explain what is vulnerable and why. Maximum 2 sentences.",
  "impact": "Explain the realistic security impact. Maximum 2 sentences.",
  "attack_scenario": "Describe how an attacker could exploit it. Maximum 2 sentences.",
  "remediation": "Give specific steps to fix the vulnerability. Maximum 3 sentences.",
  "secure_coding_advice": "Give concise secure coding advice. Maximum 3 sentences."
}}

Rules:
- Base the analysis on the provided vulnerability and code.
- Do not invent details that are not supported by the code.
- Be technically accurate.
- Be concise.
- Return JSON only.
"""

    response = requests.post(
        f"{settings.OLLAMA_URL}/api/generate",
        json={
            "model": "qwen2.5-coder:7b",
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.1,
                "num_predict": 500,
            },
        },
        timeout=(10, 60),
    )

    response.raise_for_status()

    data = response.json()

    try:
        result = json.loads(data["response"])
    except (json.JSONDecodeError, KeyError) as exc:
        raise ValueError(
            f"Invalid JSON returned by Ollama: "
            f"{data.get('response', '')}"
        ) from exc

    return {
        "explanation": result.get("explanation", ""),
        "impact": result.get("impact", ""),
        "attack_scenario": result.get("attack_scenario", ""),
        "remediation": result.get("remediation", ""),
        "secure_coding_advice": result.get(
            "secure_coding_advice",
            ""
        ),
    }