module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { presets: ['babel-preset-expo'] }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-router|react-navigation|@react-navigation/.*|react-native-svg|react-native-reanimated|react-native-mediapipe|zustand|@tanstack/.*))',
  ],
  moduleNameMapper: {
    '^react-native-mediapipe$': '<rootDir>/__mocks__/react-native-mediapipe.ts',
  },
  testMatch: [
    '**/__tests__/**/*.{ts,tsx}',
    '**/*.{spec,test}.{ts,tsx}',
  ],
  testPathIgnorePatterns: ['node_modules'],
};
