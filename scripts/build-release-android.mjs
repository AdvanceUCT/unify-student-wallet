/**
 * @fileoverview Runs the guarded Android release build and locates the resulting APK.
 * @module scripts/build-release-android
 */

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const isWindows = process.platform === "win32";
const expoCli = join(root, "node_modules", "expo", "bin", "cli");
const gradle = join(root, "android", isWindows ? "gradlew.bat" : "gradlew");
const androidStudioJbr = "C:\\Program Files\\Android\\Android Studio\\jbr";
const env = { ...process.env };
const defaultAndroidSdk = env.LOCALAPPDATA ? join(env.LOCALAPPDATA, "Android", "Sdk") : undefined;

env.NODE_ENV ??= "production";

if (!env.JAVA_HOME && isWindows && existsSync(androidStudioJbr)) {
  env.JAVA_HOME = androidStudioJbr;
}
if (!env.ANDROID_HOME && defaultAndroidSdk && existsSync(defaultAndroidSdk)) {
  env.ANDROID_HOME = defaultAndroidSdk;
}
if (!env.ANDROID_SDK_ROOT && env.ANDROID_HOME) {
  env.ANDROID_SDK_ROOT = env.ANDROID_HOME;
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(process.execPath, [expoCli, "prebuild", "--platform", "android", "--clean", "--no-install"]);
if (isWindows) run("cmd.exe", ["/d", "/s", "/c", gradle, "-p", join(root, "android"), "assembleRelease"]);
else run(gradle, ["-p", join(root, "android"), "assembleRelease"]);

const apk = join(root, "android", "app", "build", "outputs", "apk", "release", "app-release.apk");
if (!existsSync(apk)) {
  throw new Error(`Gradle completed without producing ${apk}`);
}

console.log(`\nRelease APK: ${apk}`);
