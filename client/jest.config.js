const { createDefaultPreset } = require("ts-jest");
const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.tsx?$": "ts-jest", // Ensure this is present to handle TS files
  },
  moduleNameMapper: {
    // DO NOT include utils/constants here
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif|webp|svg)$": "<rootDir>/test/__mocks__/fileMock.ts",
  },
};