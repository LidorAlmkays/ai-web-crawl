/* eslint-disable */
module.exports = {
  displayName: 'task-manager',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/task-manager',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(chalk|#ansi-styles|#supports-color)/)',
  ],
  moduleNameMapper: {
    '^chalk$': require.resolve('chalk'),
  },
};
