const { applyReleaseSigning } = require("@/plugins/withUnifyAndroidReleaseSigning");

describe("UNIFY Android release signing config plugin", () => {
  it("replaces generated debug release signing with the local release keystore properties", () => {
    const generated = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }

    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug
            shrinkResources false
        }
    }
}`;

    const configured = applyReleaseSigning(generated);

    expect(configured).toContain('findProperty("UNIFY_RELEASE_STORE_FILE")');
    expect(configured).toContain("signingConfig signingConfigs.release");
    expect(configured).not.toContain("release {\n            signingConfig signingConfigs.debug");
  });
});
