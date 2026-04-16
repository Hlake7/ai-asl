import React from 'react';
import { render } from '@testing-library/react-native';
import { ReferenceCard } from '../ReferenceCard';

describe('ReferenceCard', () => {
  it('renders the letter and hint text', () => {
    const { getByText } = render(
      <ReferenceCard letter="A" hint="Make a fist" onContinue={jest.fn()} />,
    );
    expect(getByText('A')).toBeTruthy();
    expect(getByText('Make a fist')).toBeTruthy();
  });

  it('shows placeholder when no imageUri', () => {
    const { getByTestId } = render(
      <ReferenceCard letter="A" hint="Make a fist" onContinue={jest.fn()} />,
    );
    expect(getByTestId('image-placeholder')).toBeTruthy();
  });

  it('shows Image and hides placeholder when imageUri is provided', () => {
    const { queryByTestId, getByTestId } = render(
      <ReferenceCard letter="A" hint="Make a fist" imageUri="file://a.jpg" onContinue={jest.fn()} />,
    );
    expect(queryByTestId('image-placeholder')).toBeNull();
    expect(getByTestId('letter-image')).toBeTruthy();
  });
});
