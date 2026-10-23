# Restore recovery and release acceptance

## Reproduced stages

Before-fix GitHub Actions run: https://github.com/AdvanceUCT/unify-student-wallet/actions/runs/39978014858 (commit aef5fc5). Both new regressions fail on main: a never-settling `getFormatData` keeps the stored credential list unresolved, and changing the active agent while `getAll` waits reads attributes from the replacement wallet. These establish two JavaScript failure paths. They do not establish which native call stalled on the reported phone.

The provider now serializes opens, imports and shutdowns, invalidates obsolete lifecycle results, and deduplicates resumes by wallet and generation. Readiness belongs to the returned wallet/agent pair. Home, Inbox and the credential list use generation-scoped queries; detail reads also capture the agent. Old credential cache entries are cancelled/removed during activation. Optional attribute enrichment has a two-second fallback to the existing exchange record. Native record reads have a twelve-second stage deadline; the whole Home open/read has a fifteen-second deadline and an explicit retry. Retry reads or opens the saved wallet; it never imports a backup again.

Diagnostics log stage names for timeout, without credential attributes, recovery passwords or tokens. Backup encryption, validation, file format and proof consent are unchanged. Payment authentication is not imported.

## Automated evidence

All checks run in GitHub Actions. Provider/session/query/Home tests use synthetic wallet records and a mocked native import boundary. Backup tests separately cover encrypted-store configuration and bundle/path validation. Lifecycle tests cover stale resume/reset/restore ordering. The original failing native phone sequence has not yet been reproduced on a physical device; native Askar persistence after import and full process restart remain physical acceptance items.

## Physical acceptance

No Android device was attached during implementation. Test both a fresh install and sign-out → import on an existing install using an encrypted synthetic backup, enter a new PIN, confirm multiple/empty credentials render, retry a failed read, then restart and confirm persistence. Verify idle lock immediately before/at 300 seconds and background lock before/at 120 seconds, including inactive → background transitions. CI alone does not certify the reported native restore issue as fixed.
