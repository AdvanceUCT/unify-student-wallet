# UNIFY Architecture

Status: living project context. Last updated: 2026-04-26.

This file is intentionally written for both humans and future Codex instances. Read it before making cross-repo changes.

Primary source alignment: this architecture follows `BA Innovation.docx`, which defines UNIFY as a proof-of-concept student digital identity and wallet ecosystem sponsored by IDS.

## Systems

UNIFY is split into three public GitHub repositories under `AdvanceUCT`:

- `unify-student-wallet`: React Native mobile app for students.
- `unify-admin-portal`: planned Next.js web app for administrators and issuer operations.
- `unify-vendor-portal`: planned Next.js web app for vendors and service points.

Backend/API services are expected later. They do not currently have dedicated repos in this workspace. Until those exist, API boundaries are documented in [API_CONTRACTS.md](API_CONTRACTS.md) and mocked where needed.

The current SSI direction is:

- Issuer Service: Node.js, Credo, Aries Askar, AnonCreds, Indy VDR.
- Verifier Service: Node.js, Credo, Aries Askar, AnonCreds, Indy VDR.
- Student Wallet: React Native, Expo development build, Credo holder agent, Aries Askar, AnonCreds, Indy VDR.
- Mediator: Credo mediator operated by the project or a trusted public mediator for development.
- Ledger: BCovrin Test as the development Indy network only.
- Admin/service-point UI: app-owned web frontends calling issuer and verifier backends.
- App database: simulated student records, admin users, audit/event logs, service-point records, and simulated wallet activity.

## Proof-of-Concept Boundary

The project is a controlled proof of concept, not a production rollout.

In scope:

- Simulated student registration data.
- Student Verifiable Credential design and lifecycle management.
- Simulated issuance, renewal, suspension, revocation, and verification.
- Student wallet flows for storing, presenting, and using a credential.
- Simulated wallet balance, top-up, payment, and transaction history flows.
- Vendor/service-provider verification and payment acceptance flows.
- Admin monitoring, audit logs, service-provider onboarding, and rule configuration.
- External verification demonstration scenarios.

Out of scope:

- Direct integration with live university systems.
- Use of real institutional or student data.
- Real payment gateway, bank, card, mobile-money, billing, invoicing, settlement, or reconciliation integrations.
- Building a blockchain, Hyperledger Indy, BCovrin, or low-level SSI infrastructure ourselves.
- Storing student records, payment data, UI state, or audit logs on BCovrin or any ledger.
- Full production deployment, national rollout, or enterprise operations tooling.

## Repo Responsibilities

### Student Wallet

The student wallet owns the student-facing mobile experience:

- Sign-in and session state.
- Wallet activation through `unifywallet://activate?...` links.
- Student credential display.
- Credential presentation behavior.
- QR payload parsing and validation.
- PIN and biometric unlock before credential presentation.
- Simulated wallet balance, top-up, payment, and transaction history.
- Credo holder-agent initialization.
- Aries Askar credential storage.
- SecureStore session metadata wrappers.
- Payment or service-point initiation flows from the student side.

Current implementation status:

- Expo Router scaffold exists.
- App screens are in `app/`.
- Shared mobile UI primitives are in `src/components/`.
- Mock API types and data are in `src/lib/api/`.
- QR validation lives in `src/lib/validation/qrPayload.ts`.
- Activation links are parsed in `src/features/wallet/activationLinks.ts`.
- Activation resolution is adapter-based and mocked until the issuer service exists.
- Native holder-agent code is platform-gated so web/export and Jest do not load React Native bindings.
- Credentials belong in Aries Askar through Credo. SecureStore stores only safe session metadata, PIN material, wallet IDs, credential record IDs, connection IDs, and activation state.

### Admin Portal

The admin portal owns administrative and issuer workflows:

- Credential issuing.
- Batch issuance for simulated student cohorts.
- Credential suspension, revocation, and renewal.
- Validity and eligibility rule configuration.
- Service-provider onboarding and approval.
- Student lookup and governance views.
- Audit-oriented admin workflows.
- Operational reporting.

Issuer-service integration expected from the admin side:

- Own the issuer public DID.
- Register schema, credential definition, and revocation-related objects on BCovrin Test through Indy VDR.
- Create DIDComm/AnonCreds credential offers.
- Resolve activation tokens into holder-consumable out-of-band invitations.
- Keep simulated student records and audit events in the app database, not on the ledger.

Current implementation status:

- Repo governance files exist.
- Next.js app scaffold is planned but not implemented yet.

### Vendor Portal

The vendor portal owns service-point verification workflows:

- Vendor sign-in and access control.
- Admin-provisioned vendor accounts.
- Service and pricing rule configuration.
- Vendor-generated QR codes for student verification or payment.
- Credential and payment verification result display.
- Vendor transaction history or operational views.

Verifier-service integration expected from the vendor/service-point side:

- Create proof requests.
- Receive proof presentations.
- Verify AnonCreds proofs with Credo and resolve public trust data from BCovrin Test.
- Return only the eligibility result and safe audit metadata to service-point UI.

Current implementation status:

- Repo governance files exist.
- Next.js app scaffold is planned but not implemented yet.

## Core Platform Layers

The BA document describes five conceptual internal packages:

- Student Digital Identity: VC schema, issuer agent, and credential lifecycle.
- Student Wallet: credential storage, QR/NFC presentation, wallet balance, and secure access.
- Vendor Portal: service-provider QR generation, profiles, and transaction processing.
- Verification Layer: proof requests, credential validation, eligibility checks, and verifier API behavior.
- Admin and Governance Portal: issuance, revocation, validity rules, service-provider onboarding, and audit monitoring.

## Identity and Trust Model

UNIFY uses verifiable credentials rather than physical student cards as the primary identity mechanism.

Target identity technologies from the BA document:

- W3C Verifiable Credentials as the credential standard.
- AnonCreds for privacy-aware credentials and selective disclosure.
- Credo agents for issuer, holder/wallet, and verifier behavior.
- DIDComm for secure agent-to-agent communication.
- Hyperledger Indy as the identity ledger.
- BCovrin Test Network as the development ledger, not production infrastructure.
- Indy VDR for registering and resolving DIDs, schemas, and credential definitions.
- Aries Askar and SQLite for secure wallet credential/key storage.

Ledger rule:

- No personally identifiable information, student records, payment data, UI state, or audit logs should be stored on the ledger.
- BCovrin should hold only public trust artefacts such as public DIDs, schemas, credential definitions, revocation registries, and cryptographic references.
- Student data and operational records stay off-chain in application storage.

Trust model:

- Issuer agent owns the public DID and writes credential metadata to BCovrin Test.
- Holder agent stores credentials securely on device through Aries Askar.
- Verifier agent checks proofs and resolves ledger data from BCovrin Test.
- Mediator helps the mobile wallet receive DIDComm messages reliably.

## Expected Runtime Flows

### Issue and Activate Student VC

1. Admin signs into the Admin and Governance Portal.
2. Admin selects one registered simulated student or starts a batch issuance run.
3. Backend validates the student against simulated registration data.
4. Issuer service uses Credo, AnonCreds, Aries Askar, and Indy VDR to prepare issuance from the approved schema and credential definition.
5. Credo issuer agent creates a DIDComm out-of-band invitation or credential offer.
6. Activation delivery sends `unifywallet://activate?token=<opaque-token>` to the student. Development may use `unifywallet://activate?oob=<encoded-oob-url>`.
7. Student wallet resolves the token, initializes its Credo holder agent, requires PIN setup when needed, accepts the invitation, and stores the credential in Askar.
8. Student wallet persists only safe session metadata in SecureStore.
9. System records issuance in the app database audit log.

### Verify Student VC at Service Point

1. Vendor/service point requests student verification through the vendor portal or scanner.
2. Student unlocks the wallet with PIN or biometric authentication.
3. Wallet creates a verifiable presentation through QR or NFC.
4. Verifier receives the presentation and sends it to the verification layer.
5. Credo verifier agent validates signature, issuer trust, expiry, and revocation status.
6. System applies service-specific eligibility rules.
7. Vendor sees access granted, denied, or retry/pending state.
8. Verification event is recorded in the app database audit log with timestamp, service point, and result.

### Scan QR Code to Make Simulated Payment

1. Vendor displays a QR code for a payment request.
2. Student opens the wallet and unlocks with PIN or biometric authentication.
3. Wallet scans and validates the vendor QR payload.
4. Student confirms the payment.
5. Backend checks wallet balance and service eligibility.
6. Simulated balance is deducted and vendor receives confirmation.
7. Payment transaction is recorded for wallet history and admin audit views.

### Revoke, Suspend, Renew

1. Admin selects a student credential.
2. Admin chooses renew, suspend, reinstate, or revoke.
3. Backend validates authorization and business rules.
4. Credo/Indy integration updates credential state and revocation-related ledger objects where required.
5. Wallet and verifier flows reflect updated credential state within the system objective of 60 seconds where feasible for the prototype.
6. Action is written to the audit log.

## Credential Lifecycle

The BA document defines these meaningful VC lifecycle states:

- Pending.
- Issuing.
- Offered.
- Active.
- Suspended.
- Revoked.
- Expired.
- Renewed.

Future code should model lifecycle transitions explicitly instead of treating credential status as only display text.

## Data Boundaries

- Student wallet should store only the minimum local state needed for offline-friendly UX and secure session continuity.
- Secrets belong in secure storage on device, not in plain AsyncStorage or source files.
- Production API keys and deploy credentials belong in GitHub environment secrets, not repo-wide committed files.
- Mock student data must stay clearly marked as mock data.
- Real student data should not be committed, logged, or placed in test fixtures.
- POPIA-sensitive student data must stay off-chain.
- Verification and payment logs should store only the fields needed for audit and demo reporting.

## Integration Boundaries

- The wallet should treat the backend as the authority for credential status.
- The vendor portal should not trust QR payload content without backend verification.
- The admin portal should be the primary UI for credential lifecycle actions.
- Shared API shapes should be kept aligned with [API_CONTRACTS.md](API_CONTRACTS.md) until a shared package or generated client exists.
- Vendor/service-provider accounts should be approved through the admin portal before verification access is granted.
- External verification should use a standard verifier API rather than custom integrations for each partner.

## Delivery Architecture

Each repo has GitHub collaboration files:

- Issue forms for bug reports, feature requests, tasks/chores, and security concerns.
- Pull request template.
- Dependabot configuration.
- CI, build, security, and release workflows.
- `SECURITY.md` and `CONTRIBUTING.md`.

Main branches are protected. Work should enter through pull requests.
