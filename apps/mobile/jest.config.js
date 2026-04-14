module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest', { presets: ['babel-preset-expo'] }],
  },
  // transformIgnorePatterns: paths matching these are NOT transformed.
  // With pnpm, packages live in node_modules/.pnpm/<pkg>@ver/node_modules/<pkg>/
  // The pattern must not match .pnpm so those packages get transformed.
  // We ignore node_modules that are NOT react-native ecosystem packages,
  // but never ignore .pnpm paths (so the pnpm virtual store is always transformed).
  transformIgnorePatterns: [
    '/node_modules/(?!.pnpm)(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-router|react-navigation|@react-navigation/.*|react-native-svg|react-native-reanimated|react-native-mediapipe|zustand|@tanstack/.*|@testing-library/react-native))',
  ],
  moduleNameMapper: {
    '^react-native-mediapipe$': '<rootDir>/__mocks__/react-native-mediapipe.ts',
  },
  testMatch: [
    '**/__tests__/**/*.{ts,tsx}',
    '**/*.{spec,test}.{ts,tsx}',
  ],
  testPathIgnorePatterns: ['node_modules'],
  setupFiles: ['<rootDir>/jest.setup.js'],
};
