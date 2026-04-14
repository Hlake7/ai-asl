// Manual Jest mock for react-native-reanimated
// Avoids loading native module dependencies during tests
import React from 'react';

const useSharedValue = (init: unknown) => ({ value: init });
const useAnimatedProps = (fn: () => unknown) => fn();
const withTiming = (toValue: unknown, _config?: unknown) => toValue;
const withSpring = (toValue: unknown, _config?: unknown) => toValue;
const withDelay = (_delay: number, animation: unknown) => animation;
const withSequence = (..._animations: unknown[]) => _animations[_animations.length - 1];
const withRepeat = (animation: unknown, _count?: number) => animation;
const runOnJS = (fn: (...args: unknown[]) => unknown) => fn;
const runOnUI = (fn: (...args: unknown[]) => unknown) => fn;
const useAnimatedStyle = (fn: () => unknown) => fn();
const useDerivedValue = (fn: () => unknown) => ({ value: fn() });
const interpolate = (value: number, inputRange: number[], outputRange: number[]) => {
  const index = inputRange.findIndex((v) => v >= value);
  if (index <= 0) return outputRange[0];
  if (index >= inputRange.length) return outputRange[outputRange.length - 1];
  const ratio = (value - inputRange[index - 1]) / (inputRange[index] - inputRange[index - 1]);
  return outputRange[index - 1] + ratio * (outputRange[index] - outputRange[index - 1]);
};
const Extrapolation = { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' };

const createAnimatedComponent = (Component: React.ComponentType<Record<string, unknown>>) => Component;

const Animated = {
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  ScrollView: 'ScrollView',
  createAnimatedComponent,
};

export {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  runOnJS,
  runOnUI,
  useAnimatedStyle,
  useDerivedValue,
  interpolate,
  Extrapolation,
  createAnimatedComponent,
};

export default Animated;
