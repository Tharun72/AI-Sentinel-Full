# AI Sentinel Project Handoff

## Architecture

- `backend/app/main.py` creates the FastAPI application, configures CORS, initializes the database, and registers authentication, project, and scan routes.
- `backend/app/api/auth.py` provides registration, password-token login, OAuth2 token login, and current-user retrieval.
- `backend/app/api/projects.py` provides authenticated project CRUD reads/creation and repository source retrieval.
- `backend/app/api/scans.py` creates authenticated scan jobs, lists scans, retrieves scans, and exposes persisted scan progress.
- `backend/app/models/` contains SQLAlchemy models for users, projects, scans, and persisted vulnerabilities.
- `backend/app/services/background_scan.py` performs bounded shallow Git checkout, deterministic scanning, persisted progress updates, static finding persistence, and optional Ollama enrichment.
- `backend/app/scanners/scanner.py` implements bounded deterministic pattern scanning without executing repository source.
- `backend/app/services/repository_validation.py` restricts scans to configured HTTPS hosts, rejects credentials, IP addresses, unsafe protocols, non-default ports, and unsafe branch names.
- `backend/app/services/repository_source.py` performs bounded, temporary, read-only source retrieval for the Code Editor. It validates paths, limits file types and size, and never executes checked-out code.
- `backend/app/services/secure_fix_service.py` persists and validates untrusted patch proposals in isolated temporary checkouts; it does not modify real repositories.
- `backend/app/ai/ollama_service.py` provides best-effort local Ollama analysis. Static findings remain persisted when AI is unavailable.
- `frontend/src/App.tsx` provides hash-based authenticated page navigation and the light application shell.
- `frontend/src/services/` contains the API clients for authentication, projects, scans, workspace aggregation, and repository source retrieval.
- `frontend/src/pages/` contains the dashboard, upload, scan monitoring, AI review, reports, history, and capability-aware feature pages.

## Changes implemented in this continuation

- Audited the complete current repository and confirmed the working tree initially matched commit `def5894`.
- Confirmed removal of `frontend/src/lib/data.ts` did not leave broken imports. No source file references it.
- Added authenticated `GET /projects/{project_id}/source?path=...&branch=...`.
- Added a real frontend Code Editor workflow that loads projects, accepts a branch and relative path, retrieves source from the backend, and displays the returned source read-only.
- Added repository source security controls: existing repository and branch validation, HTTPS allowlist enforcement, temporary shallow checkout, no local/file protocol, path traversal rejection, allowed text extensions, maximum file size enforcement, UTF-8 validation, clone timeout, and temporary directory cleanup.
- Removed the stale `dark` class from `frontend/index.html`.
- Updated the search modal colors to match the existing professional light theme.
- Added the missing `backend/scanner_test_repo/test_secret.py` fixture required by the existing backend test suite. It is ignored by Git as intended.
- Added focused repository-source service and API tests covering authentication, ownership isolation, path traversal, unsupported extensions, size limits, clone timeout, cleanup, and error mapping.
- Added authenticated server-side report generation at `GET /projects/reports?format=json|csv|sarif`, scoped to the current user's projects and scans.
- Added bounded report generation with configurable scan, finding, and byte limits.
- Updated the Reports page to download server-generated JSON, CSV, and SARIF exports.
- Added a persisted Secure Fix proposal/review workflow bound to a completed scan, exact vulnerability, file path, and exact persisted repository revision.
- Added isolated patch validation using a temporary shallow checkout and `git apply --check`; temporary checkouts are always removed and the real repository is never modified.
- Added explicit approval records after validation. Repository application and rollback remain deliberately unavailable because a safe isolated write service, credentials, post-apply rescan, and rollback mechanism do not exist.
- Added Secure Fix authorization and lifecycle tests.
- Added a fresh/existing database initialization regression test confirming the `secure_fixes` table and `scans.repository_revision` compatibility column are available after startup initialization.
- Tightened Secure Fixes so the proposed patch path must exactly match the persisted finding path, every patch must target only that file, and revision mismatches are rejected.
- Corrected SARIF severity mapping to standard `error`, `warning`, and `note` levels.

## Features verified

- Frontend TypeScript typecheck: passed.
- Frontend ESLint: passed.
- Frontend production build: passed. Vite reports a non-failing large JavaScript chunk warning.
- Backend scan pipeline tests: passed, 13 tests.
- Dashboard, reports, AI review, scan history, scan progress, project creation, scan creation, deterministic findings, persisted findings, optional AI persistence, and server-side report exports are implemented against real API/database data.
- AI Review displays only persisted AI fields from persisted vulnerabilities; unavailable or empty model responses remain visibly absent rather than being fabricated.
- Upload workflow creates or reuses a project and starts a real scan.
- Code Editor source retrieval is implemented but requires a reachable configured public repository and backend runtime.

## Known bugs and incomplete functionality

- Secure Fixes supports proposal, isolated validation, and explicit approval records. It intentionally does not apply or roll back repository changes; AI output and submitted patch text remain untrusted.
- Blockchain Verification is not implemented. No deployed contract, signer, chain provider, transaction persistence, or verification endpoint is present.
- Team management is not implemented. The current data model supports only individual user ownership and has no organizations, memberships, invitations, or role authorization workflow.
- API key management is not implemented. There is no hashed key model, scope system, one-time secret presentation, rotation, or revocation API.
- Settings persistence is not implemented. There are no profile, workspace preference, or notification preference endpoints.
- Reports now provide owner-scoped server-side JSON, CSV, and SARIF exports. PDF and saved-report workflows are not configured.
- Repository source retrieval reclones the repository for each request; caching or reuse should only be added with careful isolation and expiration controls.
- Existing Pydantic class-based `Config` declarations and FastAPI `on_event` startup hooks emit deprecation warnings but do not currently fail tests.
- The backend requirements file contains many unrelated heavyweight packages and should be reduced to application dependencies in a separate dependency-maintenance change.
- The frontend production bundle exceeds Vite's default 500 kB chunk warning threshold; code splitting can be added later.

## Required environment variables

Configure these in `backend/.env` using `backend/.env.example` as the template:

- `APP_NAME`
- `APP_VERSION`
- `HOST`
- `PORT`
- `DATABASE_URL`
- `SECRET_KEY`
- `ALGORITHM`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `OLLAMA_URL`
- `OLLAMA_MODEL`
- `OLLAMA_CONNECT_TIMEOUT_SECONDS`
- `OLLAMA_READ_TIMEOUT_SECONDS`
- `AI_MAX_SOURCE_CONTEXT_CHARS`
- `AI_ENABLED`
- `AI_MAX_FINDINGS`
- `AI_ENRICHMENT_CONCURRENCY`
- `AI_MAX_DURATION_SECONDS`
- `GIT_ALLOWED_HOSTS`
- `GIT_CLONE_TIMEOUT_SECONDS`
- `SCAN_MAX_FILE_SIZE_BYTES`
- `SCAN_MAX_FILES`
- `SCAN_MAX_REPOSITORY_SIZE_BYTES`
- `SCAN_TOTAL_TIMEOUT_SECONDS`
- `SCAN_PROGRESS_UPDATE_INTERVAL_SECONDS`
- `STALE_SCAN_TIMEOUT_SECONDS`
- `CORS_ORIGINS`
- `UPLOAD_DIR`
- `REPORT_DIR`
- `REPORT_MAX_SCANS`
- `REPORT_MAX_FINDINGS`
- `REPORT_MAX_BYTES`

Never commit real database credentials, JWT secrets, Ollama credentials, API keys, or blockchain private keys.

## PostgreSQL configuration

- Create a PostgreSQL database and user matching the configured `DATABASE_URL`.
- Set `DATABASE_URL` to a SQLAlchemy PostgreSQL URL using the installed `psycopg2` driver.
- Run the backend from `backend/` with the repository root on `PYTHONPATH` or use the project deployment configuration.
- Existing startup initialization creates missing tables, including `secure_fixes`, and performs narrow compatibility additions for scan progress and `scans.repository_revision`. Avoid destructive schema changes; use Alembic for broader migrations.

## Ollama configuration

- Install and run Ollama separately.
- Ensure `OLLAMA_URL` points to the reachable Ollama HTTP service.
- Pull and configure the model named by `OLLAMA_MODEL`.
- Set `AI_ENABLED=false` when local AI enrichment is intentionally unavailable. Static scanning still completes and persists findings.
- AI network failures, invalid JSON, and timeouts are treated as empty optional enrichment and do not discard static findings.

## Blockchain configuration

No blockchain configuration is currently supported. A future implementation needs, at minimum, named chain/provider configuration, contract address and ABI, signer handling outside source control, transaction status persistence, verification semantics, timeout/retry rules, and authenticated endpoints. Do not fabricate transaction hashes or verification results.

## Commands executed and real results

From `frontend/`:

- `npm install`: completed; reported 20 audit findings from the existing dependency graph. The generated lockfile metadata-only changes were discarded.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed. Vite emitted a non-failing large chunk warning.

From `backend/`:

- Installed a temporary test environment at `/tmp/ai-sentinel-venv` because the host Python had no pip or installed application dependencies.
- `PYTHONPATH=. /tmp/ai-sentinel-venv/bin/python -m pytest tests/test_scan_pipeline.py -q`: passed, 13 tests. Eight dependency/deprecation warnings were emitted.
- `PYTHONPATH=. /tmp/ai-sentinel-venv/bin/python -m pytest tests/test_repository_source.py tests/test_reports.py -q`: passed, 12 tests.
- `PYTHONPATH=. /tmp/ai-sentinel-venv/bin/python -m pytest tests/test_scan_pipeline.py tests/test_repository_source.py tests/test_reports.py -q`: passed, 25 tests. Eight dependency/deprecation warnings were emitted after removing the report timestamp warning.
- `PYTHONPATH=. /tmp/ai-sentinel-venv/bin/python -m pytest tests -q`: passed, 29 tests. Nine deprecation warnings were emitted, including the Pydantic Secure Fix schema warning.
- Focused release regression tests after final fixes: `PYTHONPATH=. /tmp/ai-sentinel-venv/bin/python -m pytest tests/test_reports.py tests/test_secure_fixes.py -q` passed, 7 tests.
- Secret audit: only `backend/.env.example` is tracked among environment-like files; it contains placeholders only (`change_me` and `replace-with...`). No real credentials, private keys, or access tokens were found in tracked source. `frontend/src/pages/ApiKeysPage.tsx` is a capability page, not a secret.
- Final frontend verification after Secure Fix changes: typecheck passed, lint passed, production build passed with the existing non-failing large-chunk warning.
- The backend test fixture `scanner_test_repo/test_secret.py` is ignored by Git and is required for the existing scanner test.

## Exact next steps

1. Add a repository file-list endpoint so the Code Editor can browse eligible files instead of requiring manual paths.
2. Add a safe isolated write service, post-apply rescan, and auditable rollback workflow before enabling repository patch application.
4. Add persisted report records and asynchronous report generation if saved reports or very large exports become a product requirement.
5. Design organization, membership, API-key, and settings models before exposing the currently informational pages.
6. Configure PostgreSQL and run end-to-end authenticated API tests against a disposable database.
7. Configure Ollama and verify a real completed scan with both static findings and persisted AI analysis.
8. Decide whether blockchain verification is required for the deployment; if yes, document the target network, contract, signer custody, and transaction lifecycle before implementation.
9. Replace deprecated Pydantic and FastAPI patterns during a compatibility-focused maintenance change.
10. Reduce `backend/requirements.txt` to direct runtime/test dependencies and address frontend audit findings without using blind force upgrades.
