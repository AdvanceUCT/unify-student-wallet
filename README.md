# UNIFY Student Wallet

[![React Native](https://img.shields.io/badge/React_Native_0.81-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo_54-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript_5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Credo](https://img.shields.io/badge/Credo_0.6-2D3748?logo=hyperledger&logoColor=white)](https://credo.js.org/)
[![Yarn](https://img.shields.io/badge/Yarn_1.22-2C8EBB?logo=yarn&logoColor=white)](https://classic.yarnpkg.com/)

The Android-first mobile application for UNIFY student credentials and wallet payments. Students use it to create a local credential wallet, receive university credentials, consent to privacy-preserving verification requests, top up a payment balance, and pay approved vendor branches.

UNIFY remains a proof of concept, but payment screens now use authenticated backend APIs rather than illustrative balances. Develop and demonstrate top-ups against a backend configured with Paystack test credentials; the mobile app does not select the provider's test/live mode.

## Current capabilities

| Area | What is implemented |
|---|---|
| First run | Three-page skippable onboarding, wallet creation, PIN setup, and pending-link resumption |
| Local security | Salted PIN protection, failed-attempt limits, automatic inactivity/background locking, optional device biometric unlock, and secure session storage |
| Holder wallet | Native Credo holder agent using Askar, AnonCreds, Indy VDR, DIDComm, and mediator pickup |
| Credentials | Activation links, out-of-band offers, accept/decline handling, local credential storage, detail views, expiry alerts, and inbox state |
| Verification | QR and App Link handling, verifier/requested-attribute review, explicit consent, proof presentation, result polling, and local activity history |
| Recovery | Password-encrypted `.unifywallet` backup, share/export, restore, backup reminders, PIN changes, and deliberate wallet reset |
| Preferences | System/light/dark theme support, onboarding replay, biometric controls, and accessibility/reduced-motion behavior |
| Payment activation | Student-number activation, six-digit OTP challenge, and a separate securely stored payment session with access-token refresh |
| Top-ups | Hosted Paystack checkout, R 10–R 5 000 amount selection, pending-top-up recovery, browser-return/app-resume reconciliation, and server-confirmed results |
| Vendor payments | Opaque branch QR scanning, server-resolved vendor and branch, amount entry, explicit review, idempotent submission, and payment receipts |
| Balance and activity | Backend balance on Home and Payments; combined payment, top-up, refund, and local verification activity with filters |
| Shared UI | Home, Payments, Scan, Activity, and Settings tabs; reusable buttons with wrapping primary labels and minimum heights; payment actions scroll with content above safe-area padding |

## System responsibilities

| Repository | Responsibility |
|---|---|
| [unify-student-wallet](https://github.com/AdvanceUCT/unify-student-wallet) | Native holder keys and credentials, consent UI, payment-session storage, and student payment screens |
| [unify-agent-service](https://github.com/AdvanceUCT/unify-agent-service) | Credential issuance/lifecycle, activation resolution, and authoritative proof verification |
| [unify-admin-portal](https://github.com/AdvanceUCT/unify-admin-portal) | Student/vendor records, payment authentication, wallet ledger, Paystack integration, balances, and transaction history |

The app needs both service origins configured. The Agent Service URL is not the payment API URL. Vendor approval, refund creation, provider webhooks, and payouts are backend/portal responsibilities; displaying a refund in this app does not initiate one.

## Security and privacy model

- Holder keys, connections, and credentials live in the device's encrypted Askar wallet.
- The app stores session and lock metadata locally; it does not upload a copy of the student's wallet to the Admin Portal.
- A student sees the vendor/service point and requested attributes before approving a proof.
- Verification trust decisions are made by the UNIFY Agent Service. The wallet presents the proof but cannot declare itself verified.
- Verification activity kept by the app is device-local and capped; vendor result records contain status and timing metadata rather than disclosed credential attributes.
- The ledger contains public identity infrastructure such as DIDs, schemas, credential definitions, and revocation data—not student records or wallet backups.
- The payment ledger is separate from that identity ledger and is maintained by the Admin Portal backend. Payment authentication uses its own bearer session, not DIDComm, proof possession, or Askar keys.
- Browser return and client-side checkout success do not credit balances. The app reads the backend's verified top-up result; Paystack secrets and webhook processing stay server-side.
- Payment amounts are validated as integer ZAR minor units (cents). The backend authorises and posts the transfer; the client does not maintain an authoritative balance.
- Backup files are protected by a recovery password of at least 12 characters. Losing both the device and the backup means the local wallet cannot be recovered.

## Supported runtimes

| Runtime | Support |
|---|---|
| Android native development build | Primary supported development target |
| Signed Android APK | Supported through the guarded local release script |
| iOS native build | Source and Expo configuration are present; requires macOS/Xcode and compatible native wallet dependencies |
| Web | UI/export target only; native Credo holder and backup operations are unavailable |
| Expo Go | Not supported because Credo, Askar, AnonCreds, Indy VDR, and SecureStore require native modules |

## Tech stack

| Layer | Technology |
|---|---|
| Application | Expo 54, React Native 0.81, React 19.1, Expo Router 6, TypeScript 5.9 |
| Wallet | Credo TS 0.6.3, Aries Askar, AnonCreds, Indy VDR, DIDComm |
| Device | Expo SecureStore, Local Authentication, Camera, File System, Document Picker, Sharing |
| State and validation | React Query 5, Zod 4 |
| Testing | Jest 29, jest-expo, React Native Testing Library |

## Repository layout

```text
unify-student-wallet/
├── app/                              # Expo Router screens
│   ├── (auth)/                       # Onboarding, activation, PIN, unlock, restore
│   ├── (wallet)/                     # Tabs, credentials, inbox, offers, backup
│   │   ├── payment-*.tsx             # Activation, amount, confirmation, receipt
│   │   └── topup-*.tsx               # Hosted checkout initiation and result
│   ├── verify/                       # Service-point and checkout proof routes
│   └── topup-return.tsx              # Paystack browser-return routing
├── src/
│   ├── components/                   # Shared wallet UI and operation states
│   ├── features/
│   │   ├── auth/                     # PIN entry controls and verification modal
│   │   ├── payment/                  # API contracts, sessions, top-ups, money, errors
│   │   ├── theme/                    # Persisted system/light/dark preference
│   │   ├── verification/             # Consent, presentation, polling, local history
│   │   └── wallet/                   # Holder agent, lock, backup, unified activity
│   ├── lib/                          # Agent/payment transports, secure storage, QR parsing
│   └── theme/                        # Colors, typography, spacing, motion, themes
├── assets/                           # App icons, images, and bundled assets
├── android/                          # Ignored native project generated by Expo prebuild
├── plugins/                          # Expo native configuration and release signing
├── scripts/                          # Guarded Android release build
├── patches/                          # patch-package fixes for native dependencies
├── __tests__/                        # Jest and component/flow tests
├── .github/workflows/                # CI, Expo export, dependency audit, release notes
├── .env.example
├── app.config.js
└── package.json
```

`src/components/AppScreen.tsx` owns shared screen width, scrolling, and action-area spacing. `AppButton.tsx` owns button sizing and label treatment, while `UnifiedActivityFeed.tsx` renders the common activity UI. Feature-specific tests also live under `src/features/**/__tests__/`.

## Local setup

### Prerequisites

- Git
- Node.js 22 (matches CI)
- Corepack and Yarn 1.22.22
- Android Studio with its bundled JDK
- Android SDK Platform and Build-Tools 36
- Android NDK `27.1.12297006`
- CMake `3.22.1`
- An Android emulator or physical device

### 1. Install dependencies

```powershell
git clone https://github.com/AdvanceUCT/unify-student-wallet.git
Set-Location unify-student-wallet
corepack enable
corepack yarn install --frozen-lockfile
```

If Yarn is not available on `PATH`, use `npx yarn@1.22.22` in place of `yarn`.

### 2. Configure the app

```powershell
Copy-Item .env.example .env.local
```

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_MEDIATOR_INVITATION_URL` | Real DIDComm mediator invitation URL; copy the invitation, not the mediator landing-page URL |
| `EXPO_PUBLIC_MEDIATOR_PICKUP_STRATEGY` | Credo message pickup strategy; the current public mediator uses `Implicit` |
| `EXPO_PUBLIC_UNIFY_ACTIVATION_HOST` | Primary Admin Portal host used for Android App Links |
| `EXPO_PUBLIC_UNIFY_ACTIVATION_HOSTS` | Comma-separated allowlist for activation and verification HTTPS links |
| `EXPO_PUBLIC_UNIFY_AGENT_API_BASE_URL` | Public base URL used for activation resolution and verification-session APIs |
| `EXPO_PUBLIC_UNIFY_PAYMENT_API_BASE_URL` | Admin Portal origin hosting `/api/wallet/v1/*`, for example `https://voskuils.com`; required for payments, with no localhost fallback |

The values are compiled into the mobile app and therefore are not secrets. Do not put private API keys, wallet keys, database credentials, or signing material in `EXPO_PUBLIC_*` variables.

For local link testing, add the required development host, such as `10.0.2.2`, to `EXPO_PUBLIC_UNIFY_ACTIVATION_HOSTS`. Plain HTTP is accepted only for the built-in local development hosts; configured non-local verification links must use HTTPS with no alternate port or embedded credentials.

### 3. Configure Android tools

The build script detects the standard Windows Android Studio locations. If your tools are elsewhere, set them for the current PowerShell session:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
```

### 4. Run a native development build

Start an emulator or connect a device, confirm it appears under `adb devices`, then run:

```powershell
corepack yarn android
```

This uses `expo run:android`; it is a native development build, not Expo Go.

## Links and verification flows

The wallet accepts the custom `unifywallet://` scheme and trusted HTTPS App Links from the configured Admin Portal host.

| Flow | Example |
|---|---|
| Credential activation | `unifywallet://activate?token=...` or `https://voskuils.com/activate?token=...` |
| Out-of-band activation | `unifywallet://activate?oob=...` |
| Static service point | `unifywallet://verify/{publicServicePointId}` or `https://voskuils.com/verify/{publicServicePointId}` |
| Checkout verification | `unifywallet://verify/checkout/{verificationRequestId}?token=...` or the HTTPS equivalent |

Activation links must contain exactly one of `token` or `oob`. Checkout tokens are single-use capabilities and should be obtained from a real vendor checkout session rather than copied into documentation or logs.

A protected link opened before onboarding, PIN setup, or unlock is retained and resumed after the wallet is ready.

For a basic Android activation routing check:

```powershell
adb shell am start -W -a android.intent.action.VIEW -d "unifywallet://activate?token=test-token" com.advanceuct.unifystudentwallet
```

A made-up token can test routing but cannot complete activation.

## Payment and top-up flows

1. Open **Payments → Activate payments**, enter the student number, and complete the six-digit code challenge. The client also accepts a session returned directly by a backend configured to bypass OTP for testing; this is not a mobile setting.
2. Choose **Top up**, enter a ZAR amount, and continue to the backend-provided Paystack checkout in the browser. The app retains the pending reference so the result can be resumed from Payments.
3. Browser return uses `unifywallet://topup-return?topUpId=...`. The result screen queries/reconciles with the backend and distinguishes pending, unknown, failed, and successful outcomes. A confirmed top-up shows one **Done** action.
4. Use the in-app scanner on a branch QR containing `unifywallet://pay/{opaqueBranchQrIdentifier}`. The payload must not include query parameters, an amount, vendor text, or secrets. The server supplies the registered vendor and branch.
5. Enter an amount, review the destination and total, and confirm payment. A successful response opens the receipt; retries after an unknown outcome reuse the request's idempotency key.

Payment submission and top-ups require connectivity. Balance and payment history come from the backend; verification history remains local. Refund credits appear as returned money in activity. Payment action groups follow the form or receipt in the scroll view, so longer screens may require scrolling to reach them.

The typed client contract lives in [`paymentApi.ts`](src/features/payment/paymentApi.ts). It covers activation, session refresh/revocation, balance/activity reads, branch resolution, payment submission, and top-up creation/status/reconciliation. There is no separate Better Auth sign-in in the student payment flow.

## Backup, restore, and reset

Create an encrypted backup from **Settings → Wallet backup**. The app validates the exported Askar data before sharing a `.unifywallet` bundle. Restore is available from the signed-out recovery flow and requires the same recovery password.

Resetting or clearing app data removes the local holder wallet from that device. Create and safely store a current backup first if the credentials must be recoverable.

To clear an Android test installation:

```powershell
adb shell pm clear com.advanceuct.unifystudentwallet
```

## Signed Android release APK

Keep the release keystore in the ignored `credentials/` directory and add the following values to your user-level Gradle properties file, normally `C:\Users\<you>\.gradle\gradle.properties`:

```properties
UNIFY_RELEASE_STORE_FILE=C:/absolute/path/to/unify-student-wallet/credentials/unify-student-wallet-release.keystore
UNIFY_RELEASE_STORE_PASSWORD=your-store-password
UNIFY_RELEASE_KEY_ALIAS=your-key-alias
UNIFY_RELEASE_KEY_PASSWORD=your-key-password
```

Never commit the keystore or its passwords. The release script checks process environment variables before Expo starts, so load `.env.local` explicitly when building from a fresh terminal:

```powershell
node --env-file=.env.local scripts/build-release-android.mjs
```

If the variables are already exported into the process environment, `npx yarn@1.22.22 android:release-apk` runs the same script. Set all five credential/verification variables listed above; the mediator URL must contain the actual invitation query. Also configure the payment API origin to enable payments in the resulting APK.

The script performs a clean Expo Android prebuild, runs Gradle `assembleRelease`, and verifies this artifact exists:

```text
android/app/build/outputs/apk/release/app-release.apk
```

Verify the release signature using your installed Android Build-Tools version:

```powershell
& "$env:ANDROID_HOME\build-tools\36.0.0\apksigner.bat" verify --verbose --print-certs android/app/build/outputs/apk/release/app-release.apk
```

The certificate's SHA-256 fingerprint must match the Admin Portal's `/.well-known/assetlinks.json` for `com.advanceuct.unifystudentwallet`. A successful build alone does not establish App Link compatibility.

Install it on a connected device with:

```powershell
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

Because the release script regenerates `android/`, commit native changes through Expo configuration/plugins rather than editing generated files only.

## Commands and CI

```powershell
corepack yarn start                # Start the Expo development server
corepack yarn android              # Build and run the Android native app
corepack yarn ios                  # Build and run iOS on a supported macOS host
corepack yarn web                  # Run the web UI target
corepack yarn lint                 # Run Expo ESLint
corepack yarn typecheck            # Run TypeScript without emitting
corepack yarn test                 # Run Jest in watch-capable local mode
corepack yarn test:ci              # Run Jest serially and exit cleanly in CI
corepack yarn build                # Export Android, iOS, and web bundles
corepack yarn android:release-apk  # Signed APK; requires exported environment (see above)
```

GitHub Actions uses Node.js 22 and Yarn's frozen lockfile. CI runs lint, type checking, and `test:ci`; the separate build workflow runs the Expo export. Release tags matching `v*.*.*` create GitHub release notes but do not build or attach an APK.

Before opening a pull request, run:

```powershell
corepack yarn lint
corepack yarn typecheck
corepack yarn test:ci
corepack yarn build
```

## Troubleshooting

- **Expo Go cannot load the wallet:** use `yarn android`; the holder stack requires custom native modules.
- **Mediator setup opens a webpage instead of connecting:** copy the mediator's invitation URL from the page, not the page URL itself.
- **A trusted HTTPS link is rejected:** check `EXPO_PUBLIC_UNIFY_ACTIVATION_HOSTS`, rebuild the app, and verify the URL uses HTTPS without a custom port.
- **Android App Links open in the browser:** ensure the Admin Portal serves `/.well-known/assetlinks.json` with the installed APK's SHA-256 signing-certificate fingerprint, then reinstall the app.
- **Payments report that the API is not configured:** set `EXPO_PUBLIC_UNIFY_PAYMENT_API_BASE_URL` to the Admin Portal origin and rebuild. The Agent Service origin cannot substitute for it.
- **Checkout returned but the top-up is still pending:** resume the existing top-up and refresh its status. Browser return is not proof of payment; backend verification/reconciliation must finish.
- **Release build reports missing public environment variables:** use the `node --env-file=.env.local` command above, or export the required variables before invoking the Yarn release script.
- **Jest appears to finish but never exits:** use `yarn test:ci`. The test environment disables infinite Reanimated loops while retaining their production behavior.
- **The web build reports unsupported wallet operations:** this is expected; use a native Android or iOS build for Credo holder, biometric, and backup flows.
