/**
 * @fileoverview Configures Metro transforms and package resolution for Credo's native dependencies.
 * @module metro.config
 */

const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts = Array.from(new Set([...config.resolver.sourceExts, "cjs"]));

module.exports = config;
