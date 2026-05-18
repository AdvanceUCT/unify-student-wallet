# UNIFY Student Wallet
[![React Native](https://img.shields.io/badge/React_Native-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Expo Router](https://img.shields.io/badge/Expo_Router-000020?logo=expo&logoColor=white)](https://docs.expo.dev/router/introduction/)
[![React Query](https://img.shields.io/badge/React_Query-FF4154?logo=reactquery&logoColor=white)](https://tanstack.com/query/latest)
[![Credo TS](https://img.shields.io/badge/Credo_TS-2D3748?logo=typescript&logoColor=white)](https://credo.js.org/)
[![AnonCreds](https://img.shields.io/badge/AnonCreds-00599C?logo=hyperledger&logoColor=white)](https://hyperledger.github.io/anoncreds-spec/)
[![Yarn](https://img.shields.io/badge/Yarn-2C8EBB?logo=yarn&logoColor=white)](https://classic.yarnpkg.com/)

<div align="center">

React Native wallet app for students to receive, store, and present their
university digital credential.

Built as an Expo development build because the wallet uses native Credo,
Askar, AnonCreds, and Indy VDR modules.
</div>

---

## Overview

UNIFY Student Wallet is the holder-side mobile app for the student digital
identity proof of concept. Students open an activation link from the Admin
Portal, create a local wallet PIN, initialize a Credo holder agent, and store
their issued student credential on the device.

The app features:

- **Credential Activation** - Opens `unifywallet://activate?...` links from email or QR flows
- **Secure Wallet Setup** - Protects local wallet access with a PIN and optional biometrics
- **Credo Holder Agent** - Initializes the mobile holder agent and stores credentials locally
- **Credential Review** - Shows stored credential details in a student-friendly layout
- **Offer Handling** - Accepts or declines pending credential offers
- **QR Scanner** - Routes activation links, payment requests, and verification requests
- **Simulated Payments** - Displays placeholder balance and payment activity for the PoC

---

## Tech Stack

### Mobile App
[![React Native](https://img.shields.io/badge/React_Native-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)

[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[![Expo Router](https://img.shields.io/badge/Expo_Router-000020?style=for-the-badge&logo=expo&logoColor=white)](https://docs.expo.dev/router/introduction/)

[![React Query](https://img.shields.io/badge/React_Query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)](https://tanstack.com/query/latest)

### Wallet / Credentials
[![Credo TS](https://img.shields.io/badge/Credo_TS-2D3748?style=for-the-badge&logo=typescript&logoColor=white)](https://credo.js.org/)

[![Aries Askar](https://img.shields.io/badge/Aries_Askar-4B5563?style=for-the-badge&logo=hyperledger&logoColor=white)](https://github.com/hyperledger/aries-askar)

[![AnonCreds](https://img.shields.io/badge/AnonCreds-00599C?style=for-the-badge&logo=hyperledger&logoColor=white)](https://hyperledger.github.io/anoncreds-spec/)

[![Indy VDR](https://img.shields.io/badge/Indy_VDR-003B57?style=for-the-badge&logo=hyperledger&logoColor=white)](https://github.com/hyperledger/indy-vdr)

### Testing
[![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)](https://jestjs.io/)

[![Testing Library](https://img.shields.io/badge/Testing_Library-E33332?style=for-the-badge&logo=testinglibrary&logoColor=white)](https://callstack.github.io/react-native-testing-library/)

---

## Project Structure

```
unify-student-wallet/
├── app/                      # Expo Router screens and navigation groups
│   ├── (auth)/               # Sign-in, activation, PIN setup, unlock screens
│   └── (wallet)/             # Home, credentials, offers, scan, payments, settings
├── src/
│   ├── components/           # Shared UI components
│   ├── features/             # Wallet, auth, credential, payment, and QR logic
│   ├── lib/                  # API client, storage wrappers, validation helpers
│   └── theme/                # Shared colors, spacing, typography, shadows
├── android/                  # Native Android project generated for dev/release builds
├── patches/                  # patch-package fixes for native dependencies
├── __tests__/                # Jest and React Native Testing Library tests
├── package.json              # Scripts and dependencies
└── README.md                 # This file
```

---

## Setup

### Prerequisites

- **Git**
- **Node.js 20+**
- **Corepack**
- **Yarn 1.22.22**
- **Android Studio**
- **Android SDK Platform Tools**
- **Android SDK Platform 36**
- **Android SDK Build-Tools 36**
- **Android NDK 27.1.12297006**
- **CMake 3.22.1**
- **Android emulator or physical Android device**

Expo Go is not enough for this app because the holder-agent flow uses native
Credo, Askar, AnonCreds, Indy VDR, SecureStore, and Expo dev-client modules.

### Installation

1. **Clone the repository**
   ```powershell
   git clone https://github.com/AdvanceUCT/unify-student-wallet.git
   cd unify-student-wallet
   ```

2. **Install dependencies**
   ```powershell
   corepack enable
   corepack yarn install --frozen-lockfile
   ```

   If `yarn` is not available on PATH:

   ```powershell
   npx yarn@1.22.22 install --frozen-lockfile
   ```

3. **Set Android environment variables**
   ```powershell
   $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
   $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
   $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
   $env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
   ```

4. **Start an Android emulator**

   Open Android Studio, start an Android Virtual Device, then confirm it is
   visible:

   ```powershell
   adb devices
   ```

5. **Build and run the development app**
   ```powershell
   npx yarn@1.22.22 expo run:android
   ```

   The first build can take several minutes. Leave Metro running after the app
   installs.

6. **Run the app after the first build**
   ```powershell
   npx yarn@1.22.22 start:dev-client
   ```

   Open the installed development build and select the running Metro server.
   On an emulator, it usually appears as:

   ```text
   http://10.0.2.2:8081
   ```

7. **Test a local activation link**
   ```powershell
   adb shell am start -W -a android.intent.action.VIEW -d "unifywallet://activate?token=test-token" com.advanceuct.unifystudentwallet
   ```

   Expected flow:

   - The deep link opens the wallet app
   - The app routes to activation or PIN setup
   - The student creates a wallet PIN
   - Credo initializes the local holder wallet
   - The wallet opens to the credential or offers flow

8. **Reset local app state**
   ```powershell
   adb shell pm clear com.advanceuct.unifystudentwallet
   ```

   Use this before retesting the first-run setup flow.

---

## Testing

### Lint
```powershell
npx yarn@1.22.22 lint
```

### TypeScript Checks
```powershell
npx yarn@1.22.22 typecheck
```

### Unit Tests
```powershell
npx yarn@1.22.22 test
```

### Expo Export Build
```powershell
npx yarn@1.22.22 build
```

---
