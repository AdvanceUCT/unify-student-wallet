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

This app uses native React Native modules for Credo, Askar, AnonCreds, Indy VDR, SecureStore, and the Expo development client. Expo Go is not enough for the activation and credential-storage flow. Teammates should use a development build on an Android emulator for the first boot.

The commands below are written for Windows PowerShell because that is the tested team path. macOS and Linux developers can use the same command order, but paths to Android SDK tools will be different.

### What A Successful First Run Proves

The first-run flow should prove that:

- Metro starts and serves the JavaScript bundle.
- Android Studio has a working emulator.
- The app builds and installs as a development build.
- `unifywallet://activate?token=...` opens the app.
- The activation flow reaches PIN setup.
- The PIN is saved.
- Credo initializes Askar wallet storage.
- The demo student credential screen loads.

If the app lands on the `Student status` credential screen after saving a PIN, the local Android setup is working.

### Required Tools

Install these before opening the repo:

- Git.
- Node.js with Corepack. Node 20 LTS or newer is recommended.
- Android Studio.
- Android Studio bundled Java runtime. On Windows this is usually `C:\Program Files\Android\Android Studio\jbr`.
- Android SDK Platform Tools. This provides `adb.exe`.
- Android SDK Platform 36.
- Android SDK Build-Tools 36.
- Android NDK `27.1.12297006`.
- CMake `3.22.1`.
- An Android emulator, such as Android Studio's default Medium Phone.

Android Studio usually installs missing SDK pieces during the first Gradle build. If the build asks to accept licenses, accept them.

### Clone The Repo

Use PowerShell:

```powershell
cd C:\Users\<your-windows-user>
git clone https://github.com/AdvanceUCT/unify-student-wallet.git
cd C:\Users\<your-windows-user>\unify-student-wallet
```

If you already have the repo:

```powershell
cd C:\Users\<your-windows-user>\unify-student-wallet
git pull
```

If `git pull` says local files such as `package.json` would be overwritten, do not use `git pull --force`. Stash your local changes, pull, then decide whether you still need the stash:

```powershell
git stash push -u -m "local setup changes"
git pull
```

### Set Android Environment Variables

Run this in every new PowerShell terminal before Android commands, or add equivalent values to your user environment variables:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
```

Check that `adb` is visible:

```powershell
adb version
```

If PowerShell says `adb` is not recognized, use the full path:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" version
```

### Install Dependencies

Use Yarn 1.22.22. The repo's `packageManager` field pins this version.

Preferred command:

```powershell
corepack enable
corepack yarn install --frozen-lockfile
```

Fallback command when `yarn` or `yarnpkg` is not on PATH:

```powershell
npx yarn@1.22.22 install --frozen-lockfile
```

The `postinstall` script runs `patch-package`. That is expected. It patches native package build flags needed by the Android development build.

### Start The Android Emulator

Use Android Studio:

1. Open Android Studio.
2. Open `Tools` -> `Device Manager`.
3. Create or select an Android Virtual Device.
4. Use a recent Android system image compatible with SDK 36.
5. Start the emulator.
6. Wait until the Android home screen is fully loaded.

Then verify PowerShell can see it:

```powershell
adb devices
```

Expected shape:

```text
List of devices attached
emulator-5554   device
```

If the list is empty, the emulator is not fully booted or Android Studio did not start it correctly. Wait, then run `adb devices` again.

### First Build And Boot

Use two terminals.

#### Terminal 1: Build, Install, And Start Metro

From the repo root:

```powershell
cd C:\Users\<your-windows-user>\unify-student-wallet

$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"

npx yarn@1.22.22 expo run:android
```

The first build can take several minutes. Gradle may install Android SDK Platform 36, Build-Tools 36, the Android NDK, and CMake. Warnings about deprecated Gradle features, SDK XML versions, Kotlin deprecations, or package attributes inside third-party manifests are usually non-blocking if the build continues.

When successful, the terminal should show:

```text
BUILD SUCCESSFUL
Starting Metro Bundler
Metro waiting on exp+unify-student-wallet://expo-development-client/?url=...
Installing ...\android\app\build\outputs\apk\debug\app-debug.apk
Opening exp+unify-student-wallet://expo-development-client/?url=...
```

Leave Terminal 1 running. This terminal is now Metro and will print app logs.

#### If The App Opens To The Expo Dev Client Launcher

This is normal for a development build. On the emulator, tap the listed development server. It usually looks like:

```text
http://10.0.2.2:8081
```

`10.0.2.2` is the Android emulator's special address for the host machine.

If the app does not connect, confirm Terminal 1 is still running Metro and that the server entry has a green dot.

### Test Activation With A Deep Link

Open Terminal 2. Keep Terminal 1 running.

Run the Android environment setup again in Terminal 2:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
```

Verify the emulator:

```powershell
adb devices
```

Inject a demo activation link:

```powershell
adb shell am start -W -a android.intent.action.VIEW -d "unifywallet://activate?token=test-token" com.advanceuct.unifystudentwallet
```

If `adb` is not on PATH, use:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell am start -W -a android.intent.action.VIEW -d "unifywallet://activate?token=test-token" com.advanceuct.unifystudentwallet
```

Expected app flow:

1. The deep link opens the wallet app.
2. The app accepts the activation link.
3. If no PIN exists, the app routes to `Set your wallet PIN`.
4. Enter a 4 to 6 digit PIN.
5. Enter the same PIN in `Confirm PIN`.
6. Tap `Save PIN`.
7. The app should route to the `Student status` credential screen.

The `Activation link accepted. Set a PIN to store the credential.` message can be brief because the route guard immediately moves pending activation to PIN setup.

### Test With The Manual Demo Code

If deep-link testing is not needed, the activation screen can use the current demo code:

```text
UNIFY-DEMO-2026
```

This verifies the app-side demo activation path. It does not prove a real backend-issued token unless the app is connected to a real activation service.

### Running The App Again Later

After the first native build is installed, day-to-day development usually only needs Metro:

```powershell
cd C:\Users\<your-windows-user>\unify-student-wallet
npx yarn@1.22.22 start:dev-client
```

Then open the installed development build on the emulator and tap the Metro server.

Re-run `npx yarn@1.22.22 expo run:android` whenever native dependencies change, `app.json` native identifiers change, Gradle files change, patches change, or the installed development build is stale.

### Reset Emulator App State

Use this when the emulator is stuck in an old activation state, an old PIN is stored, or you want to retest first-run activation:

```powershell
adb shell pm clear com.advanceuct.unifystudentwallet
```

If native libraries or the installed build may be stale, uninstall the app:

```powershell
adb uninstall com.advanceuct.unifystudentwallet
```

Then rebuild:

```powershell
npx yarn@1.22.22 expo run:android
```

### Clean Rebuild

Use this after pulling dependency, native module, or patch changes:

```powershell
cd C:\Users\<your-windows-user>\unify-student-wallet

Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android\build, android\app\build -ErrorAction SilentlyContinue

npx yarn@1.22.22 install --frozen-lockfile

$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"

adb uninstall com.advanceuct.unifystudentwallet
npx yarn@1.22.22 expo run:android
```

Use the full `adb.exe` path if `adb` is not recognized.

### Local Checks

Run these before opening a PR:

```powershell
npx yarn@1.22.22 lint
npx yarn@1.22.22 typecheck
npx yarn@1.22.22 test
npx yarn@1.22.22 build
```

`expo lint` may print a Windows message like `'yarnpkg' is not recognized...` even when the command exits successfully. Treat the command exit code as authoritative.

### Troubleshooting

#### `adb` Is Not Recognized

Set Android environment variables in the current terminal:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:ANDROID_HOME\platform-tools;$env:Path"
```

Or call `adb.exe` directly:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
```

#### `git pull --force` Still Refuses To Pull

`--force` does not overwrite local working-tree changes during a merge. Stash first:

```powershell
git stash push -u -m "local changes before pull"
git pull
```

For a first-time teammate, a fresh clone is usually simpler than repairing a dirty local checkout.

#### `patch-package` Fails During Install

This usually means `node_modules` contains old package contents from another branch or an interrupted patch. Remove `node_modules` and install again:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npx yarn@1.22.22 install --frozen-lockfile
```

Do not edit generated files in `node_modules` by hand unless you are intentionally creating a new `patch-package` patch.

#### Build Fails With `ReactAndroid::reactnativejni` Not Found

This points to an old native Askar package or stale native build output. Pull the latest branch, remove `node_modules`, remove Android build folders, reinstall, and rebuild the development client:

```powershell
git pull
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android\build, android\app\build -ErrorAction SilentlyContinue
npx yarn@1.22.22 install --frozen-lockfile
npx yarn@1.22.22 expo run:android
```

#### Build Fails With `std::snprintf` Or C++ Standard Errors

The native Askar wrapper must build with the patched C++ standard. Run a clean install so `patch-package` can apply:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npx yarn@1.22.22 install --frozen-lockfile
Remove-Item -Recurse -Force android\build, android\app\build -ErrorAction SilentlyContinue
npx yarn@1.22.22 expo run:android
```

#### App Shows The Expo Dev Client Home Screen

This is expected after installing a development build. Tap the running development server, usually `http://10.0.2.2:8081`.

If there is no server:

```powershell
npx yarn@1.22.22 start:dev-client
```

#### Deep Link Opens The App But No Activation Message Appears

If the app routes straight to PIN setup, the link was accepted and the route guard moved to the required PIN step. Continue by setting the PIN.

If nothing happens, check:

```powershell
adb devices
adb shell am start -W -a android.intent.action.VIEW -d "unifywallet://activate?token=test-token" com.advanceuct.unifystudentwallet
```

Also confirm the installed package is `com.advanceuct.unifystudentwallet`.

#### `Error during call to 'onInitializeContext' method in module 'askar'`

This means the deep link and PIN flow reached Credo, but Askar wallet storage failed to initialize. The common causes are stale native code, stale app data, or stale dependencies.

Run:

```powershell
git pull
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android\build, android\app\build -ErrorAction SilentlyContinue
npx yarn@1.22.22 install --frozen-lockfile
adb uninstall com.advanceuct.unifystudentwallet
npx yarn@1.22.22 expo run:android
```

Then inject the activation link again.

#### Metro Logs Show `Attempted to import the module ... not listed in exports`

These warnings can appear from transitive SSI dependencies such as `multiformats` or `@noble/hashes`. They are warnings, not activation failures, if the app continues bundling and running.

#### Android Build Prints SDK XML, Kotlin, Or Manifest Warnings

Warnings like these are usually non-blocking if Gradle eventually prints `BUILD SUCCESSFUL`:

- `This version only understands SDK XML versions up to 3...`
- `Setting the namespace via the package attribute...`
- Kotlin deprecation warnings from Expo or React Native packages.
- CMake long path warnings.

If the build stops, fix the first `FAILED` task in the output. The first real error is more useful than the later stack trace.

#### Port 8081 Is Busy Or Metro Is Confused

Stop old Metro terminals with `Ctrl+C`. Then restart with a clean Metro cache:

```powershell
npx yarn@1.22.22 expo start --dev-client --clear
```

If needed, use another port and follow the URL printed by Expo:

```powershell
npx yarn@1.22.22 expo start --dev-client --port 8082
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

