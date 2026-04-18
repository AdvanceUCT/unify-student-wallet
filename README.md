# UNIFY Student Wallet

Student wallet application for UNIFY.

This repo owns:

- Student-facing credential wallet flows
- Student credential activation and renewal interactions
- QR payment initiation
- Wallet security and credential presentation behavior
- Shared wallet UI and client-side state

## Working Agreement

- Work enters through issues and pull requests.
- `main` is protected and should only change through reviewed PRs.
- Use draft PRs early when work is still in progress.
- Link every PR to an issue before it is merged.
- Security-sensitive changes need two approving reviews before merge.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the Expo development server:

```bash
npm start
```

Common local checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## App Structure

- `app/` contains Expo Router screens and navigation groups.
- `src/components/` contains small shared UI primitives.
- `src/lib/api/` contains mock API data and typed client placeholders.
- `src/lib/storage/` contains secure storage wrappers for future sensitive values.
- `src/lib/validation/` contains QR payload validation.
- `src/theme/` contains shared colors, spacing, and typography.

