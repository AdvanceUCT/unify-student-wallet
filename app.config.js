const appJson = require("./app.json");

const activationHost = process.env.EXPO_PUBLIC_UNIFY_ACTIVATION_HOST ?? process.env.UNIFY_ACTIVATION_HOST ?? "localhost";
const autoVerify = activationHost !== "localhost" && activationHost !== "127.0.0.1" && activationHost !== "10.0.2.2";

module.exports = {
  ...appJson.expo,
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
