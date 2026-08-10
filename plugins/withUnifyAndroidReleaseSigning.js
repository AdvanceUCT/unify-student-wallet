const { withAppBuildGradle } = require("@expo/config-plugins");

const SIGNING_CONFIG = `    def unifyReleaseStoreFile = findProperty("UNIFY_RELEASE_STORE_FILE") ?: System.getenv("UNIFY_RELEASE_STORE_FILE")
    def unifyReleaseStorePassword = findProperty("UNIFY_RELEASE_STORE_PASSWORD") ?: System.getenv("UNIFY_RELEASE_STORE_PASSWORD")
    def unifyReleaseKeyAlias = findProperty("UNIFY_RELEASE_KEY_ALIAS") ?: System.getenv("UNIFY_RELEASE_KEY_ALIAS")
    def unifyReleaseKeyPassword = findProperty("UNIFY_RELEASE_KEY_PASSWORD") ?: System.getenv("UNIFY_RELEASE_KEY_PASSWORD")
    def unifyReleaseRequested = gradle.startParameter.taskNames.any { it.toLowerCase().contains("release") }

    if (unifyReleaseRequested && (!unifyReleaseStoreFile || !unifyReleaseStorePassword || !unifyReleaseKeyAlias || !unifyReleaseKeyPassword)) {
        throw new GradleException("Release signing is not configured. Add the UNIFY_RELEASE_* values to your user Gradle properties.")
    }

    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (unifyReleaseStoreFile) {
                storeFile file(unifyReleaseStoreFile)
                storePassword unifyReleaseStorePassword
                keyAlias unifyReleaseKeyAlias
                keyPassword unifyReleaseKeyPassword
            }
        }
    }
`;

function applyReleaseSigning(contents) {
  const signingPattern = /    signingConfigs \{[\s\S]*?\n    \}\n\s*    buildTypes \{/;
  if (!signingPattern.test(contents)) {
    throw new Error("Could not locate the generated Android signing configuration.");
  }

  let next = contents.replace(signingPattern, `${SIGNING_CONFIG}\n    buildTypes {`);
  const releasePattern = /(        release \{\n(?:            \/\/[^\n]*\n)*)            signingConfig signingConfigs\.[a-zA-Z]+/;
  if (!releasePattern.test(next)) {
    throw new Error("Could not locate the generated Android release build type.");
  }

  next = next.replace(releasePattern, "$1            signingConfig signingConfigs.release");
  return next;
}

module.exports = function withUnifyAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (gradleConfig) => {
    if (gradleConfig.modResults.language !== "groovy") {
      throw new Error("UNIFY Android release signing requires a Groovy app build file.");
    }
    gradleConfig.modResults.contents = applyReleaseSigning(gradleConfig.modResults.contents);
    return gradleConfig;
  });
};

module.exports.applyReleaseSigning = applyReleaseSigning;
