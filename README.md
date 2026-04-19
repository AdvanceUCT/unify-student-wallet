# UNIFY Student Wallet

Student wallet application for UNIFY. This repo is the React Native mobile wallet used by students to activate, store, present, and use their student Verifiable Credential.

Future Codex instances should read this file first, then:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/DECISIONS.md](docs/DECISIONS.md)
- [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md)
- [docs/WORKFLOW.md](docs/WORKFLOW.md)

## Current Status

- Stack: Expo Router, React Native, TypeScript.
- Scaffold branch: `feature/scaffold-student-wallet`.
- PR: https://github.com/AdvanceUCT/unify-student-wallet/pull/8
- Current data: mock-only; no real student data or production secrets.
- Active local checks: lint, typecheck, Jest tests, Expo export build.
- System scope: proof of concept using simulated student records, simulated payments, and simulated service-provider flows.
- Target identity stack from `BA Innovation.docx`: W3C Verifiable Credentials, AnonCreds, Credo, DIDComm, Hyperledger Indy/BCovrin, Indy VDR, and Aries Askar.

This repo owns:

- Student-facing credential wallet flows
- Student credential activation and renewal interactions
- QR payment initiation
- Service-point verification through QR/NFC presentation flows
- Simulated wallet balance, top-up, and transaction history
- Wallet security and credential presentation behavior
- Shared wallet UI and client-side state

## Working Agreement

- Work enters through issues and pull requests.
- `main` is protected and should only change through reviewed PRs.
- Use draft PRs early when work is still in progress.
- Link every PR to an issue before it is merged.
- Security-sensitive changes need two approving reviews before merge.

## Getting Started

Requirements:

- Node.js and npm
- Expo-compatible local environment
- Android Studio or Xcode only when running native emulators

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

Platform commands:

```bash
npm run android
npm run ios
npm run web
```

## App Structure

- `app/` contains Expo Router screens and navigation groups.
- `src/components/` contains small shared UI primitives.
- `src/lib/api/` contains mock API data and typed client placeholders.
- `src/lib/storage/` contains secure storage wrappers for future sensitive values.
- `src/lib/validation/` contains QR payload validation.
- `src/theme/` contains shared colors, spacing, and typography.

## Scope Alignment

This repo should stay aligned with the BA system document:

- Build for a controlled proof-of-concept, not production rollout.
- Do not use real university data.
- Do not integrate real payment gateways or bank settlement.
- Keep wallet balances and top-ups simulated until a later decision changes scope.
- Store no PII on-chain.
- Treat Credo/Aries Askar integration as the target for real credential/key storage.

## Documentation

- [Architecture](docs/ARCHITECTURE.md): systems, repo boundaries, and runtime flows.
- [Decisions](docs/DECISIONS.md): important project decisions and why they were made.
- [API Contracts](docs/API_CONTRACTS.md): draft contracts between wallet, admin, vendor, and future backend services.
- [Workflow](docs/WORKFLOW.md): GitHub Issues, PRs, checks, releases, and deployment conventions.
- [Mobile Wallet Plan](docs/MOBILE_WALLET_PLAN.md): phased implementation plan for the student wallet MVP.

