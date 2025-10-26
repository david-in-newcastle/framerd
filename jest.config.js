module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/src/test/setup.ts'],
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)(spec|test).ts',
    '!**/extension.test.ts'  // ← Exclude Mocha test
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {}]  // ← Fix deprecation warning
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/test/**',
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^vscode$': '<rootDir>/src/test/mocks/vscode-module.ts'
  }
};
