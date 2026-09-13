import shutil
import subprocess
import tempfile
from datetime import datetime

from app.database.database import SessionLocal
from app.models.scan import Scan
from app.scanners.scanner import SecurityScanner
from app.services.scan_service import save_scan_results


def run_scan_background(
    scan_id: int,
    repository_url: str,
    branch: str,
):
    db = SessionLocal()

    temp_dir = tempfile.mkdtemp(
        prefix="ai_sentinel_scan_"
    )

    try:
        # -------------------------------------------------
        # Get scan
        # -------------------------------------------------

        scan = (
            db.query(Scan)
            .filter(Scan.id == scan_id)
            .first()
        )

        if not scan:
            print(
                f"Background scan {scan_id} not found"
            )
            return

        # -------------------------------------------------
        # Mark scan as running
        # -------------------------------------------------

        scan.status = "running"
        scan.started_at = datetime.utcnow()

        db.commit()

        # -------------------------------------------------
        # Clone repository
        # -------------------------------------------------

        clone_command = [
            "git",
            "clone",
            "--branch",
            branch.strip(),
            "--single-branch",
            repository_url.strip(),
            temp_dir,
        ]

        subprocess.run(
            clone_command,
            check=True,
            capture_output=True,
            text=True,
        )

        # -------------------------------------------------
        # Run security scanner
        # -------------------------------------------------

        scanner = SecurityScanner()

        results = scanner.scan(temp_dir)

        print(
            f"Scanner results for scan {scan_id}:"
        )
        print(results)

        # -------------------------------------------------
        # Save results + AI analysis
        # -------------------------------------------------

        scan = save_scan_results(
            db=db,
            scan=scan,
            results=results,
        )

        # -------------------------------------------------
        # Mark completed
        # -------------------------------------------------

        scan.status = "completed"
        scan.completed_at = datetime.utcnow()

        db.commit()

        print(
            f"Scan {scan_id} completed successfully"
        )

    except subprocess.CalledProcessError as e:

        scan = (
            db.query(Scan)
            .filter(Scan.id == scan_id)
            .first()
        )

        if scan:
            scan.status = "failed"
            scan.completed_at = datetime.utcnow()

            db.commit()

        print("Git clone failed")
        print("Command:", e.cmd)
        print("Return code:", e.returncode)
        print("STDOUT:", e.stdout)
        print("STDERR:", e.stderr)

    except Exception as e:

        scan = (
            db.query(Scan)
            .filter(Scan.id == scan_id)
            .first()
        )

        if scan:
            scan.status = "failed"
            scan.completed_at = datetime.utcnow()

            db.commit()

        print(
            f"Background scan {scan_id} failed: {e}"
        )

    finally:

        # -------------------------------------------------
        # Delete temporary repository
        # -------------------------------------------------

        shutil.rmtree(
            temp_dir,
            ignore_errors=True,
        )

        # -------------------------------------------------
        # Close database session
        # -------------------------------------------------

        db.close()