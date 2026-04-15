module.exports = {
  testEnvironment: 'node',
  // Haste module system resolves platform-specific files (e.g. Platform → Platform.ios.js)
  haste: {
    defaultPlatform: 'ios',
    platforms: ['android', 'ios', 'native'],
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest', { presets: ['babel-preset-expo'] }],
  },
  // transformIgnorePatterns: paths matching these are NOT transformed.
  // With pnpm, packages live in node_modules/.pnpm/<pkg>@ver/node_modules/<pkg>/
  // The pattern must not match .pnpm so those packages get transformed.
  // We ignore node_modules that are NOT react-native ecosystem packages,
  // but never ignore .pnpm paths (so the pnpm virtual store is always transformed).
  transformIgnorePatterns: [
    '/node_modules/(?!.pnpm)(?!((jest-)?react-native|@react-native(-community)?|@react-native-async-storage|expo(nent)?|@expo(nent)?/.*|expo-router|react-navigation|@react-navigation/.*|react-native-svg|react-native-reanimated|react-native-mediapipe|zustand|@tanstack/.*|@testing-library/react-native))',
  ],
  moduleNameMapper: {
    '^react-native-mediapipe$': '<rootDir>/__mocks__/react-native-mediapipe.ts',
    '^react-native-svg$': '<rootDir>/__mocks__/react-native-svg.ts',
    '^react-native-reanimated$': '<rootDir>/__mocks__/react-native-reanimated.ts',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/@react-native-async-storage/async-storage.ts',
  },
  testMatch: [
    '**/__tests__/**/*.{ts,tsx}',
    '**/*.{spec,test}.{ts,tsx}',
  ],
  testPathIgnorePatterns: ['node_modules'],
  setupFiles: [
    'react-native/jest/setup.js',
    '<rootDir>/jest.setup.js',
  ],
};
