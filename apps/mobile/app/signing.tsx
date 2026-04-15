import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HandLandmarkerView } from 'react-native-mediapipe';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ConfidenceRing } from '../src/components/ConfidenceRing';
import { useLockIn } from '../src/hooks/useLockIn';
import { usePrediction } from '../src/hooks/usePrediction';

export default function SigningScreen() {
  const navigation = useNavigation();
  // targetLetter can be passed as a route param for lesson mode; null = translate mode
  const { targetLetter } = useLocalSearchParams<{ targetLetter?: string }>();

  const { prediction, onLandmarks } = usePrediction();

  const handleLock = useCallback(
    (letter: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      console.log('Locked in:', letter);
      // Plan 3 will wire this into lesson progression
    },
    [],
  );

  const { phase, ringProgress, onNewPrediction } = useLockIn({
    targetLetter: targetLetter ?? null,
    onLock: handleLock,
  });

  useEffect(() => {
    if (prediction) {
      onNewPrediction(prediction);
    }
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

      {/* Letter display */}
      <View style={styles.letterContainer}>
        {prediction?.letter ? (
          <Text style={styles.letterText}>{prediction.letter}</Text>
        ) : null}
      </View>

      {/* Confidence ring — bottom-right corner */}
      <View style={styles.ringContainer}>
        <ConfidenceRing progress={ringProgress} phase={phase} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  letterContainer: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  letterText: {
    color: '#fff',
    fontSize: 72,
    fontWeight: '700',
  },
  ringContainer: {
    position: 'absolute',
    bottom: 48,
    right: 24,
  },
});
