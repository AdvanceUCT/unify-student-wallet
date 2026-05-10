# Unify Student Wallet — Mediator Setup Context

## What This System Is

The Unify Student Wallet is a React Native (Expo) app that acts as a **Holder** in a
Self-Sovereign Identity (SSI) system built for South African universities. Students use it
to receive and store Verifiable Credentials (VCs) issued by their university.

The credential issuance flow:

1. A university admin triggers issuance from an admin portal
2. The Identity Agent Service (Node.js/Express, runs in Docker) creates a credential offer
   packaged as a deep link and emails it to the student
3. The student taps the deep link, which opens the wallet app
4. The wallet establishes a DIDComm connection with the university agent and receives the
   credential

The wallet app is the **Holder**. The university's Identity Agent Service is the
**Issuer**. Verification of credentials by third parties (verifiers) is out of scope for
the current task.

---

## The Mediator Problem

The Identity Agent Service runs in Docker with a public HTTP endpoint — it can receive
messages directly. The student wallet runs on a mobile device with no public IP and may
be offline at any time.

When the university agent needs to deliver DIDComm messages to the wallet (connection
responses, credential offers, issued credentials), it has no way to reach the device
directly. A **mediator** solves this: the wallet connects to a publicly reachable mediator
on startup, and the mediator holds incoming messages until the wallet collects them. When
the wallet establishes a DIDComm connection with the university agent, it advertises the
mediator's address as its own routing endpoint — so the university agent sends all
messages to the mediator, which forwards them to the wallet.

---

## Chosen Mediator

**Indicio Public Cloud Mediator**
https://indicio-tech.github.io/mediator/

This is a free public test mediator. It auto-accepts all mediation requests and is
appropriate for a PoC/development environment. It is not intended for production.

**Important:** The actual OOB invitation URL for the mediator must be copied from the
page above. It is a long URL starting with something like
`https://mediator2.indiciotech.io?c_i=ey...`. Indicio has previously deprecated mediator
instances (US-East 1 was retired Nov 2024), so the URL should never be hardcoded as a
literal string in source — it belongs in an environment variable.

---

## Credo-TS Architecture in This Project

This is critical context before reading any code.

The wallet uses **Credo-TS 0.6.x**, which is an ESM-based split-package architecture.
DIDComm functionality lives in `@credo-ts/didcomm` as a module separate from
`@credo-ts/core`. This is different from the Identity Agent Service, which uses the older
**0.5.x** monolithic release where everything is bundled in `@credo-ts/core`.

Do not mix 0.5.x documentation or examples into the wallet code. When reading Credo
docs, use https://credo.js.org/guides and ensure the version selector shows 0.6.x.

All Credo imports in `holderAgent.ts` are done via dynamic `import()` calls (not
top-level static imports). This is intentional — it prevents native bindings from loading
in environments where they are unavailable (web, tests). Do not change this pattern.

Packages used by the wallet:
- `@credo-ts/core` — Agent class, base config
- `@credo-ts/didcomm` — DidCommModule, transports, connection/credential protocols
- `@credo-ts/react-native` — agentDependencies for React Native
- `@credo-ts/askar` — AskarModule (wallet/KMS)
- `@openwallet-foundation/askar-react-native` — native Askar bindings
- `@credo-ts/anoncreds` — AnonCredsModule, credential format services
- `@credo-ts/indy-vdr` — IndyVdrModule, IndyVdrAnonCredsRegistry
- `@hyperledger/indy-vdr-react-native` — native Indy VDR bindings

---

## Key Files

| File | Purpose |
|------|---------|
| `holderAgent.ts` | Creates and initialises the Credo agent. All SSI and mediator config lives here. The primary file to work in. |
| `holderAgent.web.ts` | Web/test platform stub. Exports the same function signatures and types as `holderAgent.ts` but returns null stubs. Must never contain real Credo logic. Must be kept in sync with exported types. |
| `mediatorService.ts` | Currently exports a single constant `MEDIATOR_INVITATION_URL`. Intended to be the home for mediator-related config and potentially logic. |
| `HolderAgentProvider.tsx` | React context managing agent lifecycle. Exposes `createWallet`, `resumeWallet`, and `resetAgent`. Does not deal with mediator config directly — it delegates to `holderAgent.ts`. |
| `activationResolver.ts` | Resolves deep links into a `ResolvedWalletActivation` object. Handles `token` flows (calls the agent service API) and `oob` flows (resolved locally). No mediator logic currently. |

---

## Current State of Mediator Wiring

### What is already in place

**`mediatorService.ts`** exports `MEDIATOR_INVITATION_URL`, currently set to the Indicio
landing page URL (`https://indicio-tech.github.io/mediator/`). This is a placeholder —
it points to the page where you get the real invitation URL, not the actual OOB invitation
URL itself.

**`holderAgent.ts`** imports `MEDIATOR_INVITATION_URL` from `mediatorService.ts` and
passes it directly into the `DidCommModule` config:
```typescript
mediationRecipient: { mediatorInvitationUrl: MEDIATOR_INVITATION_URL },
```

Both HTTP and WebSocket outbound transports are already registered:
```typescript
transports: {
  outbound: [new DidCommHttpOutboundTransport(), new DidCommWsOutboundTransport()],
},
```

The agent is explicitly set to not act as a mediator itself:
```typescript
mediator: false,
```

**`HolderAgentProvider.tsx`** has been significantly refactored. The activation-coupled
agent initialisation from the previous version has been replaced with two explicit
lifecycle methods:
- `createWallet()` — generates a new `walletId` via UUID and initialises a fresh agent
- `resumeWallet(walletId)` — re-initialises an agent for an existing wallet (e.g. on app
  restart)

This means the wallet is now created independently of any credential offer flow, which is
the correct architecture.

**`holderAgent.ts`** now exposes discrete functions for each step of the credential flow:
- `receiveCredentialOffer(invitationUrl)` — accepts a DIDComm OOB invitation
- `acceptCredentialOffer(credentialRecordId)` — explicitly accepts a pending offer
- `declineCredentialOffer(credentialRecordId)` — declines a pending offer
- `subscribeToOfferReceived(handler)` — event subscription for incoming offers
- `getCredentialRecord(id)` — fetches a specific credential record

**`autoAcceptCredentials`** has been changed to `Never` (previously `ContentApproved`).
This means the wallet will no longer automatically accept credential offers — the student
must explicitly accept or decline via the UI.

### What is not yet resolved

**The `MEDIATOR_INVITATION_URL` value is incorrect.** The current value
`"https://indicio-tech.github.io/mediator/"` is the Indicio landing page, not an OOB
invitation URL. The real invitation URL must be obtained from that page and stored
properly (see recommendations below).

**No inbound transport is registered.** The agent has outbound transports but there is no
inbound transport in the current config. For a React Native wallet receiving messages
through a mediator via WebSocket, an inbound transport may be required. This needs to be
investigated against the installed version of `@credo-ts/react-native` and
`@credo-ts/didcomm` — check what inbound transport options are exported from these
packages.

**The `mediationRecipient` config shape has not been verified.** The object
`{ mediatorInvitationUrl: MEDIATOR_INVITATION_URL }` is passed to `mediationRecipient`
inside `DidCommModule`. Whether this is the correct field name and shape for the installed
version of `@credo-ts/didcomm` (0.6.x) needs to be confirmed against the actual TypeScript
types in `node_modules/@credo-ts/didcomm/build/`. A wrong field name would silently skip
mediator setup without throwing an error.

**The mediator URL is not environment-driven.** The URL is currently a hardcoded constant.
It should come from `process.env.EXPO_PUBLIC_MEDIATOR_INVITATION_URL` so it can be
updated without a code change when Indicio rotates their mediator instance.

---

## Recommendations

### 1. Fix the mediator invitation URL

Get the real OOB invitation URL from https://indicio-tech.github.io/mediator/ (click
"Copy Invitation URL"). It will be a long base64-encoded URL. Store it in the wallet's
`.env` file as `EXPO_PUBLIC_MEDIATOR_INVITATION_URL` and update `mediatorService.ts` to
read from `process.env.EXPO_PUBLIC_MEDIATOR_INVITATION_URL`. Add the variable to
`.env.example` with a comment explaining where to get it.

### 2. Verify the `mediationRecipient` config shape

Before assuming the existing shape is correct, check the TypeScript types exported by the
installed version of `@credo-ts/didcomm`. Running `tsc --noEmit` will surface any type
errors. Pay attention to whether additional options like `mediatorPickupStrategy` are
required or recommended.

Relevant Credo docs: https://credo.js.org/guides/tutorials/mediation (ensure 0.6.x is
selected)

### 3. Investigate inbound transport for React Native

Check `node_modules/@credo-ts/react-native/build/` and
`node_modules/@credo-ts/didcomm/build/` for exported inbound transport classes. In some
Credo versions the React Native package exports a transport suited for mobile (sometimes
called `SubjectInboundTransport` or similar). If one exists and is needed, register it
on the agent alongside the outbound transports. If the framework handles inbound message
delivery internally via the WebSocket connection to the mediator, document that finding.

### 4. Test on a physical device

The mediator flow cannot be meaningfully tested in a simulator. Once changes are in place,
test on a physical iOS or Android device with real internet access. The Identity Agent
Service must be reachable from the internet — use a tunnel (e.g. ngrok) if running
locally. Trigger issuance from the admin portal and tap the resulting deep link on the
device. Watch agent logs for: mediator connection established, DIDComm connection to
issuer established, credential offer received, credential issued.

---

## Things to Preserve

- **`holderAgent.web.ts`** — Keep in sync with `holderAgent.ts` exported types and
  function signatures. Never add real Credo logic here.
- **Dynamic import pattern** — All Credo imports use dynamic `import()`. Do not convert
  to static top-level imports.
- **`autoAcceptCredentials: Never`** — The switch to manual acceptance is intentional.
  The UI is expected to call `acceptCredentialOffer` or `declineCredentialOffer`
  explicitly.
- **Module-level agent singleton** — `holderAgent.ts` maintains `agentRef` and
  `activeWalletId` as module-level variables. This is intentional for the current
  architecture. `HolderAgentProvider` coordinates lifecycle on top of this.
