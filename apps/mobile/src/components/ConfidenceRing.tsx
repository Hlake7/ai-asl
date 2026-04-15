import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Circle, Svg } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { LockPhase } from '../hooks/useLockIn';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 120;
const STROKE_WIDTH = 8;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER = RING_SIZE / 2;

const COLOR_IDLE = 'rgba(255,255,255,0.15)';
const COLOR_FILLING = '#4A90E2';
const COLOR_LOCKED = '#00C851';

interface ConfidenceRingProps {
  /** 0–1, drives how much of the ring is filled */
  progress: number;
  phase: LockPhase;
}

export function ConfidenceRing({ progress, phase }: ConfidenceRingProps) {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, { duration: 80 });
  }, [progress, animatedProgress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - animatedProgress.value),
  }));

  const strokeColor = phase === 'locked' ? COLOR_LOCKED : COLOR_FILLING;
  const showProgress = phase !== 'idle' || progress > 0;

  return (
    <View style={styles.container}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        {/* Background track */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          stroke={COLOR_IDLE}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        {/* Progress arc */}
        {showProgress && (
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke={strokeColor}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            animatedProps={animatedProps}
            strokeLinecap="round"
            rotation="-90"
            origin={`${CENTER}, ${CENTER}`}
          />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: RING_SIZE,
    height: RING_SIZE,
  },
});
