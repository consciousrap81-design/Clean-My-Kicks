# Security CI

Every PR and push to `main` runs `.github/workflows/security.yml`, which contains four independent jobs:

| Job | What it does | Fails the build on |
| --- | --- | --- |
| **Dependency audit** | `npm ci --ignore-scripts` + `npm audit --audit-level=high` | High or critical CVEs in dependencies |
| **Secret scanning** | Gitleaks across full git history | Any committed secret (API keys, tokens, private keys) |
| **SQL / RLS policy check** | Greps `supabase/migrations/*.sql` for unsafe patterns | A migration that creates a `public.*` table without `ENABLE ROW LEVEL SECURITY`, `CREATE POLICY`, and a `GRANT` — or one that flips a storage bucket public via raw SQL |
| **Static analysis** | Semgrep with `p/typescript`, `p/react`, `p/owasp-top-ten`, `p/secrets` | Any error-severity finding |

The workflow also runs every Monday at 06:00 UTC to catch newly disclosed CVEs in pinned dependencies.

## Local checks

Reproduce the most useful checks locally before pushing:

```bash
npm audit --audit-level=high
npx gitleaks detect --no-banner
# Static analysis (requires semgrep installed):
semgrep --config p/typescript --config p/react --config p/owasp-top-ten --config p/secrets
```

## When a job fails

- **Dependency audit** — run `npm audit fix`, or bump the offending package manually if a breaking change is required.
- **Secret scanning** — rotate the leaked credential immediately, then remove it from history (`git filter-repo` or BFG). Adding the secret to `.gitignore` is not sufficient.
- **SQL / RLS policy check** — every new `public.*` table must include `GRANT`, `ENABLE ROW LEVEL SECURITY`, and at least one `CREATE POLICY` in the same migration.
- **Static analysis** — fix the reported issue, or add a justified `// nosemgrep: <rule-id>` comment on the specific line.

## Runtime scanning

CI covers static checks only. The Lovable Cloud security scanner (Security tab) keeps running against the live database and surfaces RLS / policy issues that depend on actual table state.