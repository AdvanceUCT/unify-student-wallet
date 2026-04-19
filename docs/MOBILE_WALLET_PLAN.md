# Mobile Wallet MVP Plan

Status: implementation plan for the student wallet MVP. Last updated: 2026-04-19.

## Summary

Build the wallet in five PRs. Keep each PR shippable, tested, and reviewable.

Current repo state at plan creation:

- Repo: `C:\Users\caleb\OneDrive\Documents\New project\unify-student-wallet`
- Baseline branch: `main`
- Baseline commit: `29eae70 [codex] Scaffold Expo student wallet app (#8)`
- Stack: Expo Router, React Native, TypeScript, TanStack Query, Zod, Expo SecureStore, Expo Camera, Expo Crypto
- Product scope: controlled proof of concept with simulated student data, simulated payments, and simulated service-provider flows
- Target identity stack later: W3C Verifiable Credentials, AnonCreds, Credo, DIDComm, Hyperledger Indy/BCovrin, Indy VDR, Aries Askar

## PR 1: Wallet State, Activation, And Unlock

Branch:

```bash
feature/wallet-activation-state
```

Goal: establish the core wallet state machine before adding payments or deeper credential behavior.

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
- Add or update auth screens:
  - Sign in: creates a demo session.
  - Activate: accepts demo activation code `UNIFY-DEMO-2026`.
  - Set PIN: collects and confirms a 4-6 digit PIN.
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
- PIN setup requires matching 4-6 digit PIN entries.
- Activated wallet routes to unlock after restart.
- Correct PIN unlocks wallet tabs.
- Incorrect PIN shows an error without clearing state.
- Sign out clears session state and returns to sign-in.
- Lock wallet returns to unlock screen without clearing activation.

## PR 2: Simulated Wallet Ledger And Top-Up

Branch:

```bash
feature/simulated-wallet-ledger
```

Goal: make wallet balance and transaction history behave like a real demo ledger while staying fully simulated.

Implementation changes:

- Replace static payment history with a local simulated ledger service.
- Store ledger state locally so demo balance and history survive reload.
- Represent money internally as cents.
- Add a ZAR formatting helper.
- Add top-up actions for `R50`, `R100`, and `R250`.
- Update Home to read current balance from the ledger.
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

type WalletLedger = {
  currency: "ZAR";
  balanceCents: number;
  transactions: WalletTransaction[];
};
```

Acceptance criteria:

- Top-up changes balance immediately.
- Top-up creates an approved transaction.
- Transaction history persists after reload.
- Home and Payments use the same ledger state.
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
  - no live SSI ledger integration yet
  - Credo/Aries/Indy integration is future work

Acceptance criteria:

- A teammate can run the demo using only repo docs.
- App clearly communicates every success and failure state.
- Wallet demonstrates the BA document's wallet-side MVP flow.
- All checks pass locally and in GitHub Actions.

## Future Spike: SSI Feasibility

Branch:

```bash
feature/ssi-wallet-spike
```

Goal: determine the safest path for Credo/Aries/Indy integration in the Expo React Native wallet.

Questions to answer:

- Can required Credo mobile dependencies work in Expo Go?
- Is an Expo development build or prebuild required?
- What native modules are needed for Aries Askar, Indy VDR, secure random values, and DIDComm flows?
- What is the minimum proof-of-concept path for receiving and storing a credential?
- What must stay in the backend/issuer/verifier service instead of the mobile app?

Deliverables:

- `docs/SSI_SPIKE.md`
- Recommendation: Expo Go, Expo development build, or prebuild/native workflow
- Minimal dependency list
- Risks and follow-up implementation tasks

Do not start this before PR 1-3 unless the project priority changes.

## General Implementation Rules

- Keep the app proof-of-concept scoped.
- Do not use real student data.
- Do not integrate real payment gateways or bank settlement.
- Do not store PII on-chain.
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
2. `Wallet: simulated balance, top-up, and transaction ledger`
3. `Wallet: QR payment and verification review flows`
4. `Wallet: credential lifecycle demo controls`
5. `Wallet: MVP polish and demo script`
6. `Wallet: SSI mobile integration feasibility spike`

Suggested labels:

- `wallet`
- `feature`
- `security`
- `high-priority` for PR 1
- `docs` for PR 5 and SSI spike

## Assumptions

- The next implementation focus is the student wallet only.
- The plan optimizes for a mock-first demonstrable MVP.
- PIN plus optional biometric is the chosen unlock model.
- Simulated local ledger is the chosen payment/top-up model.
- Demo activation code is `UNIFY-DEMO-2026`.
- Currency is ZAR.
- PIN length is 4-6 digits.
- SecureStore is acceptable for the current scaffold state.
- Credo/Aries/Indy dependencies are intentionally deferred to a separate feasibility spike.
- Each PR should be opened as a draft PR first, then marked ready after local and GitHub checks pass.
