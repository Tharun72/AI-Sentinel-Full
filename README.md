# AI Sentinel

AI Sentinel is a self-hosted security review platform for public HTTPS Git repositories. It creates owner-scoped projects, runs bounded static analysis, persists findings and scan history, supports optional local Ollama enrichment, and provides an isolated secure-fix review workflow. A fix approval records a review decision only: it never writes to, pushes to, or executes code from a repository.

## What is implemented

- Authenticated project ownership and owner-scoped scans, source viewing, reports, fixes, and audit history.
- Bounded shallow Git clones from configured HTTPS hosts only. Local paths, credentials in URLs, IP hosts, non-default ports, unsafe branches, and Git prompts are rejected.
- Static patterns for hardcoded credentials/private keys, SQL injection, shell execution, unsafe deserialization, likely path traversal, and weak cryptography. Repositories are not executed.
- File, repository-size, file-count, clone, AI, and total scan-time limits. Dependency/generated directories, symlinks, binary files, and oversized files are skipped.
- Persisted scan states, progress, findings, severity/risk summaries, JSON/CSV/SARIF reports, and sanitized finding evidence.
- Secure-fix proposals bound to a completed scan, exact finding, file path, and revision. Validation uses `git apply --check` in a temporary shallow checkout; approval is available only after validation.
- Audit history with project access checks, paging/filtering, canonical JSON SHA-256 hash chains, and a verification endpoint/UI.

## Important limitations

The scanner is pattern-based, so it can miss vulnerabilities and generate false positives. It is not a replacement for code review, dependency analysis, secret rotation, or penetration testing. AI enrichment is optional and unavailable findings are never fabricated.

Audit hash chains make ordinary partial edits detectable by the verifier. They are not blockchain-backed, immutable, or independently witnessed: an administrator able to rewrite the database can rewrite all events and recompute chain heads. Protect database credentials, backups, and database access accordingly.

No repository patch application, push, rollback, organization/team management, API-key management, or managed cloud AI provider is implemented.

## Run locally

Prerequisites: Python 3.12+, Node.js 20+, Git, and PostgreSQL. Ollama is optional.

1. Configure the backend:

   ```powershell
   Copy-Item backend/.env.example backend/.env
   # Edit backend/.env: set DATABASE_URL and a long random SECRET_KEY.
   ```

2. Create a virtual environment and install backend dependencies:

   ```powershell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

   Startup creates missing tables and applies the repository's narrow compatibility additions for existing `scans`, `secure_fixes`, and `vulnerabilities` tables. Use a proper Alembic migration workflow for broader production schema changes.

3. In another terminal, start the frontend:

   ```powershell
   cd frontend
   npm ci
   npm run dev
   ```

   Open `http://127.0.0.1:5173`, create an account, then add a permitted public repository.

## Configuration

`backend/.env.example` lists all configuration. The important values are:

- `DATABASE_URL`, `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`
- `GIT_ALLOWED_HOSTS`, `GIT_CLONE_TIMEOUT_SECONDS`, `SCAN_MAX_*`, `STALE_SCAN_TIMEOUT_SECONDS`
- `AI_ENABLED`, `OLLAMA_URL`, `OLLAMA_MODEL`, and AI timing/limit settings
- `CORS_ORIGINS`, `REPORT_MAX_*`

Do not commit `.env` files, credentials, JWTs, private keys, or repository tokens. The scanner intentionally supports only repositories that can be cloned anonymously over HTTPS.

## Verification

From `frontend/`:

```powershell
npm run typecheck
npm run lint
npm run build
```

From `backend/`, after installing the test/runtime dependencies:

```powershell
$env:PYTHONPATH='.'
python -m unittest discover -s tests -v
```

The test suite mocks Git and AI interactions; it does not require live credentials, a blockchain, a running Ollama instance, or external repository access.
