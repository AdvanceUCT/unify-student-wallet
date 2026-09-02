/**
 * @fileoverview Registers native-module Jest mocks shared across the test suite.
 * @module jest.setup
 */

/* global jest */

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@react-native-community/netinfo", () =>
  require("@react-native-community/netinfo/jest/netinfo-mock"),
);
