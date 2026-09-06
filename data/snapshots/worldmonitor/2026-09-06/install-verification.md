# World Monitor install verification · 2026-09-06

This file records a reproducible editorial check, not a certification of every feature or a security guarantee.

## Target

- Repository: `koala73/worldmonitor`
- Commit: `fd52b129087aa6eb5a1df400d6dfc9fae28c0bef`
- Commit time: `2026-09-06T13:51:29+02:00`
- Project-declared Node version: `24` (`.nvmrc`)
- Verification runtime: Node `24.19.0`, npm `11.17.0`

## Commands and observed results

```bash
npm ci
npm run typecheck
npm run dev -- --host 127.0.0.1 --port 4173
curl --silent --show-error --output /tmp/worldmonitor-index.html \
  --write-out '%{http_code}' http://127.0.0.1:4173/
```

Observed:

- `npm ci` completed successfully in about 59 seconds and installed 1,660 packages.
- `npm run typecheck` completed successfully.
- Vite `6.4.3` started in about 310 ms.
- The root route returned HTTP `200` and rendered the expected application shell with the title `World Monitor - Real-Time Global Intelligence Dashboard`.

## What this proves

The checked-out source can be dependency-installed, type-checked, and started on the project-declared Node major version. A reader can reach the base development interface.

## What this does not prove

- Full data completeness without third-party API credentials.
- A production-ready self-hosted deployment.
- Desktop binary freshness or parity with the web application.
- Absence of reachable vulnerabilities.

During the no-credential development run, several feeds fell back, failed, or reported missing services such as Redis. This is consistent with the project's documented multi-service and API-key requirements.

## Dependency audit snapshot

`npm audit --omit=dev --json` reported 26 production-dependency advisories: 13 high, 13 moderate, and 0 critical. Many were transitive. This is an inventory signal only; it is not a reachability analysis and does not establish that the running application is exploitable.

## Editorial result

`verified_install: true`, with the boundary “base source-development path verified; full production and desktop paths not verified.”
