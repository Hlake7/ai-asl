// Jest mock for react-native-svg
import React from 'react';

const MockSvg = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('Svg', null, children);

const MockCircle = (_props: Record<string, unknown>) =>
  React.createElement('Circle', null);

const MockRect = (_props: Record<string, unknown>) =>
  React.createElement('Rect', null);

const MockPath = (_props: Record<string, unknown>) =>
  React.createElement('Path', null);

const MockG = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('G', null, children);

const MockText = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('Text', null, children);

export const Svg = MockSvg;
export const Circle = MockCircle;
export const Rect = MockRect;
export const Path = MockPath;
export const G = MockG;
export const Text = MockText;
export default MockSvg;
