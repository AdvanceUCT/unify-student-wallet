# UNIFY Student Wallet

Student wallet application for UNIFY. This repo is the React Native mobile wallet used by students to activate, store, present, and use their student Verifiable Credential.

Future Codex instances should read this file first, then:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/DECISIONS.md](docs/DECISIONS.md)
- [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md)
- [docs/WORKFLOW.md](docs/WORKFLOW.md)

## Current Status

- Stack: Expo Router, React Native, TypeScript.
- Active feature: AD-39 wallet activation with Credo holder-agent support.
- Package workflow: Yarn 1 through Corepack.
- Runtime requirement: Expo development build for native Credo/Askar/AnonCreds/Indy VDR bindings. Expo Go is not sufficient for this feature.
- Current data: simulated student, balance, and payment data only; no real student data or production secrets.
- Active local checks: lint, typecheck, Jest tests, Expo export build.
- System scope: proof of concept using simulated student records, simulated payments, and simulated service-provider flows.
- Identity stack: Credo holder agent, DIDComm, AnonCreds, Aries Askar wallet storage, Indy VDR, and BCovrin Test as the development Indy ledger.
- Ledger boundary: BCovrin Test is used only for public DID, schema, credential definition, and revocation-related objects. Student records, payment data, UI state, and audit logs stay off-ledger in application storage.

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

- Node.js with Corepack enabled
- Yarn 1.22.22 through `packageManager`
- Expo-compatible local environment
- Expo development build when testing the native holder agent
- Android Studio or Xcode only when running native emulators

Install dependencies:

```bash
corepack enable
corepack yarn install --frozen-lockfile
```

Start the Expo development server:

```bash
corepack yarn start
```

Start for a development client:

```bash
corepack yarn start:dev-client
```

Common local checks:

```bash
corepack yarn lint
corepack yarn typecheck
corepack yarn test
corepack yarn build
```

Platform commands:

```bash
corepack yarn android
corepack yarn ios
corepack yarn web
```

## App Structure

- `app/` contains Expo Router screens and navigation groups.
- `src/components/` contains small shared UI primitives.
- `src/lib/api/` contains mock API data and typed client placeholders.
- `src/lib/storage/` contains secure storage wrappers for future sensitive values.
- `src/lib/validation/` contains QR payload validation.
- `src/theme/` contains shared colors, spacing, and typography.

## Activation And SSI Notes

The wallet accepts activation links shaped as `unifywallet://activate?token=<opaque-token>`. For development, it also accepts `unifywallet://activate?oob=<encoded-oob-url>` so an issuer-provided DIDComm out-of-band invitation can be exercised before the activation service exists.

The issuer service, verifier service, mediator, app database, email delivery, and fallback web landing pages are integration points outside this repo. This app owns the holder-side activation flow, local PIN gate, Credo holder-agent initialization, Askar credential storage, and safe SecureStore session metadata.

Implementation basis:

- [Credo Agent Setup](https://credo.js.org/guides/getting-started/set-up)
- [Aries Askar](https://credo.js.org/guides/getting-started/set-up/aries-askar)
- [AnonCreds](https://credo.js.org/guides/getting-started/set-up/anoncreds)
- [Indy VDR](https://credo.js.org/guides/getting-started/set-up/indy-vdr)
- [Credo DIDComm issuance](https://credo.js.org/guides/tutorials/issue-an-anoncreds-credential-over-didcomm)
- [Credo mediation](https://credo.js.org/guides/tutorials/mediation)
- [BCovrin Test](https://test.bcovrin.vonx.io/)
- [VON Network](https://github.com/bcgov/von-network)
- [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/)

## Scope Alignment

This repo should stay aligned with the BA system document:

- Build for a controlled proof-of-concept, not production rollout.
- Do not use real university data.
- Do not integrate real payment gateways or bank settlement.
- Keep wallet balances and top-ups simulated until a later decision changes scope.
- Store no PII on-chain.
- Do not build a blockchain or write student/payment/audit records to BCovrin.
- Treat Credo, Aries Askar, AnonCreds, Indy VDR, DIDComm, and BCovrin changes as security-sensitive.

## Documentation

- [Architecture](docs/ARCHITECTURE.md): systems, repo boundaries, and runtime flows.
- [Decisions](docs/DECISIONS.md): important project decisions and why they were made.
- [API Contracts](docs/API_CONTRACTS.md): draft contracts between wallet, admin, vendor, and future backend services.
- [Workflow](docs/WORKFLOW.md): GitHub Issues, PRs, checks, releases, and deployment conventions.
- [Mobile Wallet Plan](docs/MOBILE_WALLET_PLAN.md): phased implementation plan for the student wallet MVP.

