import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testEnvironment: 'node',
  testTimeout: 60000,
  verbose: true,
  globalSetup: './setup/global-setup.js',
  setupFiles: ['./setup/load-env.js'],
};

export default config;
