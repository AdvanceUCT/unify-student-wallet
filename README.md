# UNIFY Student Wallet

[![React Native](https://img.shields.io/badge/React_Native_0.81-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo_54-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript_5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Credo](https://img.shields.io/badge/Credo_0.6-2D3748?logo=hyperledger&logoColor=white)](https://credo.js.org/)
[![Yarn](https://img.shields.io/badge/Yarn_1.22-2C8EBB?logo=yarn&logoColor=white)](https://classic.yarnpkg.com/)

The holder-side mobile application for the UNIFY student digital credential system. Students use it to activate a local wallet, receive university credentials, and consent to privacy-preserving verification requests.

The wallet is a proof of concept. Payment screens and balances are illustrative and do not move real money.

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
| PoC payments | Placeholder balance, activity, and payment QR parsing for demonstrations only |

## Security and privacy model

- Holder keys, connections, and credentials live in the device's encrypted Askar wallet.
- The app stores session and lock metadata locally; it does not upload a copy of the student's wallet to the Admin Portal.
- A student sees the vendor/service point and requested attributes before approving a proof.
- Verification trust decisions are made by the UNIFY Agent Service. The wallet presents the proof but cannot declare itself verified.
- Verification activity kept by the app is device-local and capped; vendor result records contain status and timing metadata rather than disclosed credential attributes.
- The ledger contains public identity infrastructure such as DIDs, schemas, credential definitions, and revocation data—not student records or wallet backups.
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
│   ├── (wallet)/                     # Home, credentials, inbox, scan, backup, settings
│   └── verify/                       # Service-point and checkout proof routes
├── src/
│   ├── components/                   # Shared wallet UI and operation states
│   ├── features/
│   │   ├── verification/             # Consent, presentation, polling, local history
│   │   └── wallet/                   # Holder agent, sessions, lock, backup, credentials
│   ├── lib/                          # API, environment, link and QR validation helpers
│   └── theme/                        # Colors, typography, spacing, motion, themes
├── android/                          # Generated/native Android project
├── plugins/                          # Expo native configuration and release signing
├── scripts/                          # Guarded Android release build
├── patches/                          # patch-package fixes for native dependencies
├── __tests__/                        # Jest and component/flow tests
├── .env.example
├── app.config.js
└── package.json
```

## Local setup

### Prerequisites

- Git
- Node.js 20 or later
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

Never commit the keystore or its passwords. Build the APK with:

```powershell
corepack yarn android:release-apk
```

The script performs a clean Expo Android prebuild, runs Gradle `assembleRelease`, and verifies this artifact exists:

```text
android/app/build/outputs/apk/release/app-release.apk
```

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
corepack yarn android:release-apk  # Produce a signed Android release APK
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
- **Jest appears to finish but never exits:** use `yarn test:ci`. The test environment disables infinite Reanimated loops while retaining their production behavior.
- **The web build reports unsupported wallet operations:** this is expected; use a native Android or iOS build for Credo holder, biometric, and backup flows.
