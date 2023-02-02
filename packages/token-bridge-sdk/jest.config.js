/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/src/setupTests.ts'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
};
