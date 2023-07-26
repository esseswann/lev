const config = {
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  }
}

export default config
