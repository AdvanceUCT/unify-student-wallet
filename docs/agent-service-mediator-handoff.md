# Agent Service Mediator Handoff

Status: handoff notes for `unify-agent-service`.
Wallet repo context: `unify-student-wallet` is now configured to use a DIDComm mediator from `EXPO_PUBLIC_MEDIATOR_INVITATION_URL` and defaults mediator pickup to Credo `Implicit` WebSocket mode.

## Goal

Make sure the Identity Agent Service can issue a credential to the mobile wallet after the student accepts a DIDComm credential offer. The wallet is the Holder. The agent service is the Issuer. The mediator is only used for messages addressed to the mobile wallet.

## Wallet Assumptions

- The wallet initializes its Credo holder agent with `mediationRecipient: { mediatorInvitationUrl, mediatorPickupStrategy }`.
- The default pickup strategy is `Implicit`, matching Indicio public mediator invitations that include a `wss://.../ws` service endpoint.
- The mediator invitation URL is wallet environment config, not part of the activation resolve response.
- The wallet accepts activation links, receives issuer OOB invitations, listens for `offer-received`, and lets the student call Credo `acceptOffer`.
- After `acceptOffer`, Credo handles the credential request, credential receipt, ack/done protocol messages, and storage in the holder wallet.
- The wallet does not call `POST /wallet/activation/complete`.
- The wallet does not notify the admin portal directly. Completion/admin status should be derived from issuer-side Credo events in agent-service.

## Agent-Service Checklist

Check or implement these items in `unify-agent-service`.

### 1. Real Issuer Credential Offer Flow

- Replace any stubbed invitation or offer functions with real Credo issuer calls.
- Create a DIDComm OOB invitation or offer URL that the wallet can consume through `receiveInvitationFromUrl`.
- Bind activation tokens to the intended student and intended credential offer.
- Return only the issuer invitation URL from wallet activation resolve; do not return the mediator invitation URL for the current wallet-wide mediator setup.

Expected activation resolve shape remains:

```json
{
  "activationId": "activation-001",
  "activationSource": "token",
  "createdAt": "2026-09-01T12:00:00Z",
  "credentialExchangeId": "issuer-exchange-001",
  "expiresAt": "2026-09-02T12:00:00Z",
  "invitationId": "invitation-001",
  "invitationUrl": "https://issuer.example/oob?oob=...",
  "issuerLabel": "UNIFY Issuer Service"
}
```

### 2. Public DIDComm Endpoint

- The issuer invitation must advertise a DIDComm endpoint reachable by the physical mobile device.
- Do not advertise Docker localhost, `127.0.0.1`, or a host-only container URL in invitations.
- For local testing, expose the agent service through ngrok, Cloudflare Tunnel, or another HTTPS tunnel and configure Credo with that public endpoint.
- Confirm the same public base URL is used anywhere the wallet needs to call activation resolve, e.g. `EXPO_PUBLIC_UNIFY_AGENT_API_BASE_URL`.

### 3. Transports

- Configure inbound HTTP transport for the issuer agent so it can receive DIDComm messages from the wallet.
- Configure outbound HTTP transport for normal DIDComm delivery.
- Configure outbound WebSocket transport if the issuer must send to wallet-mediated `ws` or `wss` endpoints.
- Do not configure agent-service as the wallet mediator. It should be the issuer only.

### 4. Issuer-Side Credential State Handling

- Listen for issuer-side Credo credential state changes.
- Treat issuer `done` as the completion signal for admin portal status updates.
- Use the issuer-side event to update activation/credential issuance state in the agent-service database.
- Do not require the wallet to call a separate completion endpoint for this flow.

### 5. Credential Issuance Requirements

- Ensure the student AnonCreds schema and credential definition are available on BCovrin Test or the configured development ledger.
- Ensure issued credentials include the required student attributes:
  - student number
  - name
  - faculty or programme
  - enrolment status
  - validity period
- Keep PII and credential payloads off-ledger.

## End-to-End Test Procedure

1. Copy the real Indicio mediator invitation URL into the wallet environment:

```env
EXPO_PUBLIC_MEDIATOR_INVITATION_URL=https://mediator2.indiciotech.io?c_i=...
EXPO_PUBLIC_MEDIATOR_PICKUP_STRATEGY=Implicit
```

2. Expose agent-service to the physical device and configure the wallet:

```env
EXPO_PUBLIC_UNIFY_AGENT_API_BASE_URL=https://your-agent-service-tunnel.example
```

3. Start the wallet with the native dev client on a physical device.
4. Start agent-service with public DIDComm endpoint config pointing to the tunnel URL.
5. Trigger credential issuance from the admin portal or agent-service test command.
6. Open the activation deep link on the device.
7. Confirm wallet receives the offer and shows it as pending.
8. Accept the offer in the wallet.
9. Confirm agent-service receives the credential request, issues the credential, and reaches issuer `done`.
10. Confirm the wallet stores the signed credential through Credo.
11. Confirm admin portal status is updated from agent-service state, not from a wallet callback.

## Common Failure Checks

- Wallet startup fails: check `EXPO_PUBLIC_MEDIATOR_INVITATION_URL` is the copied invitation URL, not `https://indicio-tech.github.io/mediator/`.
- Wallet cannot resolve activation token: check `EXPO_PUBLIC_UNIFY_AGENT_API_BASE_URL` is reachable from the phone.
- Wallet receives no offer: check issuer invitation URL and DIDComm endpoint are public and not localhost.
- Offer is accepted but credential never arrives: check issuer outbound transport, mediator-routed wallet endpoint handling, and issuer credential state logs.
- Admin status never completes: check agent-service issuer-side `CredentialStateChanged` handling for `done`.
