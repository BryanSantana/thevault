export default {
  testEnvironment: "node",
  // No transforms needed
  transform: {},

  testMatch: ["**/__tests__/**/*.test.js"],

  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
};
