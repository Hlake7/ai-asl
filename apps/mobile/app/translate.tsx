import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { HandLandmarkerView } from 'react-native-mediapipe';
import { ConfidenceRing } from '../src/components/ConfidenceRing';
import { useLockIn } from '../src/hooks/useLockIn';
import { usePrediction } from '../src/hooks/usePrediction';
import { useWordBuilder } from '../src/hooks/useWordBuilder';
import { useAppStore } from '../src/store/useAppStore';

export default function TranslateScreen() {
  const navigation = useNavigation();
  const recordLockIn = useAppStore((s) => s.recordLockIn);

  const { prediction, onLandmarks } = usePrediction();
  const { currentWord, history, onLockIn, clearCurrentWord } = useWordBuilder({
    onRecordLockIn: recordLockIn,
  });

  const handleLock = useCallback(
    (letter: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      onLockIn(letter);
    },
    [onLockIn],
  );

  const { phase, ringProgress, onNewPrediction } = useLockIn({
    targetLetter: null, // accept any letter
    onLock: handleLock,
  });

  useEffect(() => {
    if (prediction) onNewPrediction(prediction);
  }, [prediction, onNewPrediction]);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <HandLandmarkerView
        style={StyleSheet.absoluteFillObject}
        activeCamera="front"
        numHands={1}
        runningMode="LIVE_STREAM"
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        model={require('../assets/hand_landmarker.task')}
        onHandLandmarkerResults={onLandmarks}
      />

      {/* Word history — newest closest to center */}
      <View style={styles.historyContainer}>
        {[...history].reverse().map((word, i) => (
          <Text key={`${word}-${i}`} style={[styles.historyWord, { opacity: 0.3 + i * 0.12 }]}>
            {word}
          </Text>
        ))}
      </View>

      {/* Live predicted letter (dim until locked) */}
      {prediction?.letter && (
        <View style={styles.liveLetter}>
          <Text style={[styles.liveLetterText, phase === 'locked' && styles.liveLetterLocked]}>
            {prediction.letter}
          </Text>
        </View>
      )}

      {/* Current word */}
      <View style={styles.currentWordContainer}>
        <Text style={styles.currentWord}>
          {currentWord.length > 0 ? currentWord : ' '}
        </Text>
      </View>

      {/* Clear button */}
      <Pressable
        style={({ pressed }) => [styles.clearButton, pressed && styles.clearButtonPressed]}
        onPress={clearCurrentWord}
      >
        <Text style={styles.clearText}>clear</Text>
      </Pressable>

      {/* Confidence ring */}
      <View style={styles.ringContainer}>
        <ConfidenceRing progress={ringProgress} phase={phase} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  historyContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 4,
  },
  historyWord: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  liveLetter: {
    position: 'absolute',
    top: '38%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  liveLetterText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 36,
    fontWeight: '600',
  },
  liveLetterLocked: {
    color: '#00C851',
  },
  currentWordContainer: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  currentWord: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 4,
  },
  clearButton: {
    position: 'absolute',
    bottom: 48,
    left: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  clearButtonPressed: { opacity: 0.6 },
  clearText: { color: '#aaa', fontSize: 14 },
  ringContainer: {
    position: 'absolute',
    bottom: 48,
    right: 24,
  },
});
