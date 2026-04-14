import React from 'react';
import { render } from '@testing-library/react-native';
import { ConfidenceRing } from '../../src/components/ConfidenceRing';

// react-native-reanimated is mocked via moduleNameMapper in jest.config.js
// (react-native-reanimated/mock pulls in native deps and cannot be required directly)

describe('ConfidenceRing', () => {
  it('renders without crashing at 0 progress', () => {
    const { toJSON } = render(
      <ConfidenceRing progress={0} phase="idle" />,
    );
    expect(toJSON()).not.toBeNull();
  });

  it('renders without crashing at full progress', () => {
    const { toJSON } = render(
      <ConfidenceRing progress={1} phase="filling" />,
    );
    expect(toJSON()).not.toBeNull();
  });

  it('renders without crashing in locked phase', () => {
    const { toJSON } = render(
      <ConfidenceRing progress={1} phase="locked" />,
    );
    expect(toJSON()).not.toBeNull();
  });
});
