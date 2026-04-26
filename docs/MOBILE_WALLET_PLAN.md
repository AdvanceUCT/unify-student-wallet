# Mobile Wallet MVP Plan

Status: implementation plan for the student wallet MVP. Last updated: 2026-04-26.

## Summary

Build the wallet in focused PRs. AD-39 changes the activation priority: the wallet now implements real holder-side Credo activation instead of deferring SSI to a future spike. Keep each PR shippable, tested, and reviewable.

Current repo state at plan creation:

- Repo: `C:\Users\caleb\OneDrive\Documents\New project\unify-student-wallet`
- Baseline branch: `main`
- Baseline commit: `29eae70 [codex] Scaffold Expo student wallet app (#8)`
- Stack: Expo Router, React Native, TypeScript, TanStack Query, Zod, Expo SecureStore, Expo Camera, Expo Crypto
- Product scope: controlled proof of concept with simulated student data, simulated payments, and simulated service-provider flows
- Active identity stack: Credo holder agent, DIDComm, AnonCreds, Aries Askar, Indy VDR, BCovrin Test, and Expo development builds for native bindings

## PR 1: Wallet State, Activation, And Unlock

Branch:

```bash
feature/wallet-activation-state
```

Goal: establish the core wallet state machine and holder-side activation path before adding payments or deeper credential behavior.

Implementation changes:

- Install `expo-local-authentication`.
- Add a wallet session provider at the root layout.
- Persist session, activation state, PIN hash, PIN salt, wallet ID, student ID, and biometric preference through the existing SecureStore wrapper.
- Use `expo-crypto` to hash PIN values with a per-wallet salt.
- Add app route guards:
  - signed out -> `/(auth)/sign-in`
  - signed in but not activated -> `/(auth)/activate`
  - activated but locked -> `/(auth)/unlock`
  - activated and unlocked -> `/(wallet)/home`
- Add a pure activation-link parser for `unifywallet://activate?token=<opaque-token>` and development `unifywallet://activate?oob=<encoded-oob-url>`.
- Add a typed activation resolver adapter. Until the issuer service exists, the adapter returns a clearly marked mock DIDComm out-of-band invitation shape.
- Initialize a platform-gated Credo React Native holder agent with Aries Askar, AnonCreds, Indy VDR, BCovrin Test genesis config, outbound DIDComm transport, and optional mediation recipient config.
- Store credentials in Aries Askar through Credo. Store only wallet/session IDs, credential record ID, connection ID, PIN state, and safe activation metadata in SecureStore.
- Add or update auth screens:
  - Sign in: creates a demo session.
  - Activate: accepts activation links and keeps demo activation code `UNIFY-DEMO-2026` as a fallback path.
  - Set PIN: collects and confirms a 4-6 digit PIN before final credential storage when no PIN exists.
  - Unlock: unlocks with PIN, with biometric option when available.
- Update Settings:
  - Lock wallet.
  - Sign out.
  - Toggle biometric unlock when local authentication is available.

Minimum types:

```ts
type WalletAuthStatus = "signedOut" | "signedIn";
type WalletActivationStatus = "notActivated" | "activationPending" | "activated";
type WalletLockStatus = "locked" | "unlocked";

type WalletSession = {
  authStatus: WalletAuthStatus;
  activationStatus: WalletActivationStatus;
  lockStatus: WalletLockStatus;
  studentId?: string;
  walletId?: string;
};
```

Acceptance criteria:

- Fresh app launch starts at sign-in.
- Demo sign-in routes to activation.
- Invalid activation code shows an error.
- Valid activation code routes to PIN setup.
- Valid activation link routes to PIN setup when no PIN exists.
- Activation through link resolution never persists the raw token or full OOB URL in session JSON.
- PIN setup requires matching 4-6 digit PIN entries.
- PIN setup completes credential acceptance and stores only safe activation metadata in SecureStore.
- Activated wallet routes to unlock after restart.
- Correct PIN unlocks wallet tabs.
- Incorrect PIN shows an error without clearing state.
- Sign out clears session state and returns to sign-in.
- Lock wallet returns to unlock screen without clearing activation.

## PR 2: Simulated Wallet Balance And Top-Up

Branch:

```bash
feature/simulated-wallet-balance
```

Goal: make wallet balance and transaction history behave like a real demo balance/activity surface while staying fully simulated. Avoid using "ledger" language for payment activity so it is not confused with BCovrin.

Implementation changes:

- Replace static payment history with a local simulated wallet-activity service.
- Store simulated balance/activity state locally so demo balance and history survive reload.
- Represent money internally as cents.
- Add a ZAR formatting helper.
- Add top-up actions for `R50`, `R100`, and `R250`.
- Update Home to read current balance from the simulated activity service.
- Update Payments screen into a useful wallet activity surface:
  - current balance
  - top-up actions
  - transaction list newest first
  - status labels for approved, pending, declined

Minimum types:

```ts
type WalletTransactionKind = "TopUp" | "Payment" | "Verification";
type WalletTransactionStatus = "Approved" | "Pending" | "Declined";

type WalletTransaction = {
  id: string;
  kind: WalletTransactionKind;
  status: WalletTransactionStatus;
  amountCents?: number;
  vendor?: string;
  servicePointId?: string;
  occurredAt: string;
  reason?: string;
};

type WalletBalanceActivity = {
  currency: "ZAR";
  balanceCents: number;
  transactions: WalletTransaction[];
};
```

Acceptance criteria:

- Top-up changes balance immediately.
- Top-up creates an approved transaction.
- Transaction history persists after reload.
- Home and Payments use the same simulated balance/activity state.
- Transaction amounts display as ZAR.
- Empty state appears when no transactions exist.

## PR 3: QR Verification And Payment Review Flow

Branch:

```bash
feature/service-qr-flows
```

Goal: turn QR scanning into the wallet's main service-point interaction for simulated payments and credential verification.

Implementation changes:

- Use `CameraView` barcode scanning for QR codes.
- Continue validating QR payloads through the existing discriminated Zod schema:
  - `type: "payment"`
  - `type: "verification"`
- Add a scan-result state so duplicate scans do not immediately trigger repeated actions.
- Add review flows:
  - Payment review.
  - Verification review.
- Payment review displays vendor ID, service point ID, amount, available balance, and confirm/cancel actions.
- Verification review displays service point ID, credential lifecycle state, enrolment status, and minimum attributes that would be disclosed.
- Confirming payment approves when balance is sufficient, declines when insufficient, deducts only on approval, and records the transaction.
- Confirming verification approves only when lifecycle state is `Active` and enrolment status is `Registered`, then records the event.
- Invalid QR payloads show a retryable error.

Acceptance criteria:

- Payment QR scans and opens payment review.
- Verification QR scans and opens verification review.
- Invalid QR does not crash the app.
- Insufficient balance declines without deduction.
- Approved payment updates balance and transaction history.
- Approved verification records a verification transaction.
- User can cancel review and return to scanner.
- Camera permission denied state remains understandable.

## PR 4: Credential Lifecycle Demo Controls

Branch:

```bash
feature/credential-lifecycle-demo
```

Goal: make credential status demonstrable without waiting for the admin portal or backend.

Implementation changes:

- Persist mock credential lifecycle state locally.
- Add a clearly labelled demo/developer section in Settings.
- Allow switching lifecycle state:
  - Active
  - Suspended
  - Expired
  - Revoked
- Update Credential screen tone and copy based on lifecycle state.
- Update Home to show whether the credential is usable.
- Update verification flow:
  - Active + Registered -> approved
  - Suspended -> denied
  - Expired -> denied
  - Revoked -> denied
- Keep this visibly marked as demo behavior so it is not confused with real admin control.

Acceptance criteria:

- Lifecycle state changes affect Home, Credential, and Verification Review.
- Suspended, Expired, and Revoked credentials cannot verify successfully.
- State survives reload.
- Demo controls are isolated to Settings and labelled as prototype controls.

## PR 5: MVP Polish And Demo Script

Branch:

```bash
feature/wallet-mvp-polish
```

Goal: make the wallet demo understandable to teammates and markers without needing chat context.

Implementation changes:

- Tighten UI copy for sign-in, activation, PIN setup, unlock, credential display, top-up, QR payment, QR verification, and lifecycle denial.
- Add consistent loading, empty, error, success, and declined states.
- Add `docs/DEMO_SCRIPT.md` with the end-to-end demo:
  - fresh sign-in
  - activate wallet
  - set PIN
  - unlock wallet
  - view credential
  - top up balance
  - scan simulated payment QR
  - scan simulated verification QR
  - suspend credential in demo controls
  - show verification denial
- Add sample QR payloads to the demo script.
- Add a short MVP limitations section:
  - payments are simulated
  - student records are simulated
  - no live university integration
- BCovrin Test is development-only and stores only public trust objects
- student records, payment data, UI state, and audit logs stay off-ledger

Acceptance criteria:

- A teammate can run the demo using only repo docs.
- App clearly communicates every success and failure state.
- Wallet demonstrates the BA document's wallet-side MVP flow.
- All checks pass locally and in GitHub Actions.

## AD-39: Credo Activation Link And Holder Agent

Branch:

```bash
feature/ad-39-credo-activation
```

Goal: implement real holder-wallet activation in the student wallet using Credo, Aries Askar, AnonCreds, Indy VDR, DIDComm, and BCovrin Test. This replaces the former "future SSI spike" with implementation work.

Implementation changes:

- Switch the wallet package workflow to Yarn 1 because Credo's Expo React Native guidance depends on Yarn resolutions for native module compatibility.
- Add `expo-dev-client`, Credo packages, React Native Askar, AnonCreds, Indy VDR bindings, `react-native-get-random-values`, `react-native-fs`, a custom `index.js`, a `metro.config.js` with `cjs` support, and the `noop/.gitkeep` workaround.
- Consume initial activation URLs and runtime Linking events on the activation screen.
- Resolve activation tokens through `POST /wallet/activation/resolve` when the issuer service exists. Until then, use a mock resolver with the same typed boundary.
- Accept issuer-provided DIDComm out-of-band invitations with the Credo holder agent.
- Require PIN setup before final credential storage for first activation.
- Complete activation through `POST /wallet/activation/complete` when the activation service exists. Until then, use the local typed mock completion adapter.
- Keep issuer service, verifier service, mediator hosting, email delivery, fallback landing pages, and app database implementation outside this repo.

Acceptance criteria:

- `unifywallet://activate?token=<opaque-token>` and `unifywallet://activate?oob=<encoded-oob-url>` parse deterministically and reject malformed links.
- Activation screen handles initial URLs and runtime Linking events.
- Holder-agent factory is mocked or platform-gated in Jest so native bindings do not break CI.
- SecureStore serialization never includes raw activation tokens, full OOB URLs, or full credential payloads.
- Native smoke testing uses an Expo development build path, not Expo Go.

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

## General Implementation Rules

- Keep the app proof-of-concept scoped.
- Do not use real student data.
- Do not integrate real payment gateways or bank settlement.
- Do not store PII on-chain.
- Do not build a blockchain.
- Use BCovrin Test only for public DID, schema, credential definition, and revocation-related objects.
- Keep student records, payment data, UI state, and audit logs in normal backend/database storage.
- Treat Credo, Aries Askar, AnonCreds, Indy VDR, DIDComm, and BCovrin changes as security-sensitive.
- Treat mock APIs as local adapters that can later be replaced by backend calls.
- Keep route guards deterministic and testable.
- Prefer small typed services over logic embedded directly in screens.
- Keep screens useful and calm; avoid dashboard-card clutter.
- Use utility copy, not marketing copy.
- Keep border radius at 8px or less.
- Keep colors restrained and consistent with the existing palette.
- Add tests with each PR rather than deferring all testing to the end.

## Recommended GitHub Issues

Create one issue per PR:

1. `Wallet: activation, session, PIN, and unlock state`
2. `Wallet: simulated balance, top-up, and transaction activity`
3. `Wallet: QR payment and verification review flows`
4. `Wallet: credential lifecycle demo controls`
5. `Wallet: MVP polish and demo script`
6. `Wallet: Credo activation link and holder agent`

Suggested labels:

- `wallet`
- `feature`
- `security`
- `high-priority` for PR 1
- `docs` for PR 5 and SSI spike

## Assumptions

- The next implementation focus is the student wallet only.
- The plan keeps simulated payments and student records but uses real holder-side Credo activation for AD-39.
- PIN plus optional biometric is the chosen unlock model.
- Simulated local balance/activity is the chosen payment/top-up model.
- Demo activation code is `UNIFY-DEMO-2026`.
- Currency is ZAR.
- PIN length is 4-6 digits.
- SecureStore is acceptable for the current scaffold state.
- Credo/Aries/Indy holder dependencies are included now and require an Expo development build for native smoke testing.
- Each PR should be opened as a draft PR first, then marked ready after local and GitHub checks pass.
