/**
 * @fileoverview Normalizes the wallet's public API, mediator, and trusted-link configuration.
 * @module lib/config/env
 */

export const appConfig = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "mock",
  environmentName: process.env.EXPO_PUBLIC_ENVIRONMENT ?? "local",
};
