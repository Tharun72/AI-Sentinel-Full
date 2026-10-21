from __future__ import annotations

import csv
import io
import json
from datetime import UTC, datetime
from typing import Literal

from app.core.config import settings
from app.models.project import Project
from app.models.scan import Scan

ReportFormat = Literal["json", "csv", "sarif"]


def _scan_record(scan: Scan) -> dict[str, object]:
    return {
        "id": scan.id,
        "project_id": scan.project_id,
        "repository_url": scan.repository_url,
        "branch": scan.branch,
        "status": scan.status,
        "created_at": scan.created_at.isoformat() if scan.created_at else None,
        "started_at": scan.started_at.isoformat() if scan.started_at else None,
        "completed_at": scan.completed_at.isoformat() if scan.completed_at else None,
        "files_scanned": scan.files_scanned,
        "vulnerabilities_found": scan.vulnerabilities_found,
        "risk_score": scan.risk_score,
        "vulnerabilities": [
            {
                "id": finding.id,
                "scan_id": finding.scan_id,
                "vulnerability_type": finding.vulnerability_type,
                "file_path": finding.file_path,
                "line_number": finding.line_number,
                "count": finding.count,
                "severity": finding.severity,
                "cvss": finding.cvss,
                "description": finding.description,
                "recommendation": finding.recommendation,
                "ai_explanation": finding.ai_explanation,
                "ai_impact": finding.ai_impact,
                "ai_attack_scenario": finding.ai_attack_scenario,
                "ai_remediation": finding.ai_remediation,
                "ai_secure_coding_advice": finding.ai_secure_coding_advice,
                "created_at": finding.created_at.isoformat() if finding.created_at else None,
            }
            for finding in scan.vulnerabilities
        ],
    }


def build_report(projects: list[Project], scans: list[Scan], report_format: ReportFormat) -> tuple[str, str, str]:
    if len(scans) > settings.REPORT_MAX_SCANS:
        raise ValueError("Report exceeds the configured scan limit.")
    finding_count = sum(len(scan.vulnerabilities) for scan in scans)
    if finding_count > settings.REPORT_MAX_FINDINGS:
        raise ValueError("Report exceeds the configured finding limit.")
    project_names = {project.id: project.name for project in projects}
    records = [_scan_record(scan) for scan in scans]
    generated_at = datetime.now(UTC).isoformat()

    if report_format == "json":
        payload = {
            "generated_at": generated_at,
            "projects": [
                {
                    "id": project.id,
                    "name": project.name,
                    "description": project.description,
                    "repository_url": project.repository_url,
                }
                for project in projects
            ],
            "scans": records,
        }
        content = json.dumps(payload, indent=2)
        if len(content.encode("utf-8")) > settings.REPORT_MAX_BYTES:
            raise ValueError("Report exceeds the configured size limit.")
        return content, "application/json", "ai-sentinel-report.json"

    if report_format == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(
            output,
            fieldnames=[
                "project", "scan_id", "status", "branch", "created_at", "files_scanned",
                "finding_id", "severity", "vulnerability_type", "file_path", "line_number",
                "cvss", "description", "recommendation",
            ],
        )
        writer.writeheader()
        for scan in scans:
            findings = scan.vulnerabilities or [None]
            for finding in findings:
                writer.writerow({
                    "project": project_names.get(scan.project_id, f"Project {scan.project_id}"),
                    "scan_id": scan.id,
                    "status": scan.status,
                    "branch": scan.branch or "",
                    "created_at": scan.created_at.isoformat() if scan.created_at else "",
                    "files_scanned": scan.files_scanned or 0,
                    "finding_id": finding.id if finding else "",
                    "severity": finding.severity if finding else "",
                    "vulnerability_type": finding.vulnerability_type if finding else "",
                    "file_path": finding.file_path if finding else "",
                    "line_number": finding.line_number if finding else "",
                    "cvss": finding.cvss if finding else "",
                    "description": finding.description if finding else "",
                    "recommendation": finding.recommendation if finding else "",
                })
        content = output.getvalue()
        if len(content.encode("utf-8")) > settings.REPORT_MAX_BYTES:
            raise ValueError("Report exceeds the configured size limit.")
        return content, "text/csv", "ai-sentinel-report.csv"

    results = []
    for scan in scans:
        for finding in scan.vulnerabilities:
            results.append({
                "ruleId": finding.vulnerability_type,
                "level": {
                    "critical": "error",
                    "high": "error",
                    "medium": "warning",
                    "low": "note",
                }.get((finding.severity or "medium").lower(), "warning"),
                "message": {"text": finding.description or finding.vulnerability_type},
                "locations": [{
                    "physicalLocation": {
                        "artifactLocation": {"uri": finding.file_path or "unknown"},
                        "region": {"startLine": finding.line_number or 1},
                    }
                }],
                "properties": {
                    "cvss": finding.cvss,
                    "recommendation": finding.recommendation,
                    "scanId": scan.id,
                },
            })
    payload = {
        "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
        "version": "2.1.0",
        "runs": [{
            "tool": {"driver": {"name": "AI Sentinel"}},
            "results": results,
        }],
    }
    content = json.dumps(payload, indent=2)
    if len(content.encode("utf-8")) > settings.REPORT_MAX_BYTES:
        raise ValueError("Report exceeds the configured size limit.")
    return content, "application/sarif+json", "ai-sentinel-report.sarif"
