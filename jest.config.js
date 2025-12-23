module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Transform files
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  
  // Transform ESM packages that aren't transformed by default
  transformIgnorePatterns: [
    'node_modules/(?!(aws-amplify|@aws-amplify|graphql-ws)/)',
  ],
  
  // Module file extensions
  moduleFileExtensions: ['js', 'jsx', 'json'],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  
  // Test match patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
    '<rootDir>/src/**/*.{spec,test}.{js,jsx}',
    '<rootDir>/e2e/**/*.{test,spec}.{js,jsx}',
  ],
  
  // Test timeout for e2e tests
  testTimeout: 30000,
  
  // Module name mapper for CSS and other assets
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/src/__mocks__/fileMock.js',
  },
  
  // Coverage settings
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/index.js',
    '!src/reportWebVitals.js',
  ],
};

