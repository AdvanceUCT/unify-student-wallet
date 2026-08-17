/**
 * @fileoverview Builds the Expo application configuration, native identifiers, and deep-link settings.
 * @module app.config
 */

const appJson = require("./app.json");

const activationHost = process.env.EXPO_PUBLIC_UNIFY_ACTIVATION_HOST ?? process.env.UNIFY_ACTIVATION_HOST ?? "localhost";
const autoVerify = activationHost !== "localhost" && activationHost !== "127.0.0.1" && activationHost !== "10.0.2.2";

module.exports = {
  ...appJson.expo,
  extra: {
    ...appJson.expo.extra,
    ethereumRpcUrl: process.env.EXPO_PUBLIC_ETHEREUM_RPC_URL,
    studentRegistryAddress: process.env.EXPO_PUBLIC_STUDENT_REGISTRY_ADDRESS,
    walletBalanceAddress: process.env.EXPO_PUBLIC_WALLET_BALANCE_ADDRESS,
    studentPaymentAddress: process.env.EXPO_PUBLIC_STUDENT_PAYMENT_ADDRESS,
  },
  plugins: [
    ...(appJson.expo.plugins ?? []),
    "./plugins/withUnifyAndroidReleaseSigning",
  ],
  android: {
    ...appJson.expo.android,
    intentFilters: [
      ...(appJson.expo.android.intentFilters ?? []),
      {
        action: "VIEW",
        autoVerify,
        category: ["BROWSABLE", "DEFAULT"],
        data: [
          {
            scheme: "https",
            host: activationHost,
            pathPrefix: "/activate",
          },
          {
            scheme: "https",
            host: activationHost,
            pathPrefix: "/verify",
          },
        ],
      },
    ],
  },
};
