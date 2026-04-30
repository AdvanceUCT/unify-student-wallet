# Contributing

## Workflow

1. Create or pick up an issue before starting work.
2. Branch from `main`.
3. Open a draft pull request early for visibility.
4. Fill in the pull request template.
5. Link the issue using `Closes #123`.
6. Wait for checks, code owner review, and conversation resolution before merge.

## Branches

- Use feature branches only.
- Do not push directly to `main`.
- Keep branches focused on one issue or closely related set of changes.

## Reviews

- Normal changes require at least one approval.
- Security-sensitive changes require at least two approvals.
- Resolve review conversations before merging.
- Squash merge is the expected merge method.

## Local Checks

Run the checks that apply to the files you changed:

```bash
corepack enable
corepack yarn install --frozen-lockfile
corepack yarn lint
corepack yarn typecheck
corepack yarn test
corepack yarn build
```

If a command is not configured yet, note that in the PR.

Credo/Askar/AnonCreds/Indy VDR wallet changes require an Expo development build for native smoke testing:

```bash
corepack yarn start:dev-client
```

