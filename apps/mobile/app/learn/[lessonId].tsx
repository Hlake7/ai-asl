import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { HandLandmarkerView } from 'react-native-mediapipe';
import { ConfidenceRing } from '../../src/components/ConfidenceRing';
import { LessonStepComplete } from '../../src/components/LessonStepComplete';
import { LessonStepIntro } from '../../src/components/LessonStepIntro';
import { LessonStepReviewIntro } from '../../src/components/LessonStepReviewIntro';
import { ReferenceCard } from '../../src/components/ReferenceCard';
import { UNIT_1 } from '../../src/data/lessons';
import { useLockIn } from '../../src/hooks/useLockIn';
import { useLessonSession } from '../../src/hooks/useLessonSession';
import { usePrediction } from '../../src/hooks/usePrediction';
import { useAppStore } from '../../src/store/useAppStore';

export default function LessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const router = useRouter();
  const { userName, completeLesson, recordLockIn } = useAppStore();

  const lesson = UNIT_1.find((l) => l.id === lessonId);

  const { currentStep, progress, advance } = useLessonSession({
    lesson: lesson!,
    userName: userName ?? '',
    onComplete: completeLesson,
    onRecordLockIn: recordLockIn,
  });

  const { prediction, onLandmarks } = usePrediction();

  const isSigningStep = currentStep.type === 'signing';
  const signingLetter =
    currentStep.type === 'signing' ? currentStep.letter : '__NONE__';

  const handleLock = useCallback(
    (_letter: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      advance();
    },
    [advance],
  );

  const { phase, ringProgress, onNewPrediction } = useLockIn({
    targetLetter: signingLetter,
    onLock: handleLock,
  });

  useEffect(() => {
    if (prediction && isSigningStep) {
      onNewPrediction(prediction);
    }
  }, [prediction, isSigningStep, onNewPrediction]);

  if (!lesson) return null;

  if (currentStep.type === 'complete') {
    return (
      <LessonStepComplete
        lessonTitle={lesson.title}
        onDone={() => router.back()}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera always mounted */}
      <HandLandmarkerView
        style={StyleSheet.absoluteFillObject}
        activeCamera="front"
        numHands={1}
        runningMode="LIVE_STREAM"
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        model={require('../../assets/hand_landmarker.task')}
        onHandLandmarkerResults={onLandmarks}
      />

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Step overlays — only shown for non-signing steps */}
      {currentStep.type === 'intro' && (
        <LessonStepIntro letters={currentStep.letters} onStart={advance} />
      )}
      {currentStep.type === 'reference' && (
        <ReferenceCard
          letter={currentStep.letter}
          hint={currentStep.hint}
          onContinue={advance}
        />
      )}
      {currentStep.type === 'review_intro' && (
        <LessonStepReviewIntro letters={currentStep.letters} onContinue={advance} />
      )}

      {/* Signing overlays — target letter + confidence ring */}
      {isSigningStep && (
        <>
          <View style={styles.targetLetterContainer}>
            <Text style={styles.targetLetter}>{signingLetter}</Text>
          </View>
          <View style={styles.ringContainer}>
            <ConfidenceRing progress={ringProgress} phase={phase} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
  },
  targetLetterContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  targetLetter: {
    color: '#fff',
    fontSize: 80,
    fontWeight: '700',
  },
  ringContainer: {
    position: 'absolute',
    bottom: 48,
    right: 24,
  },
});
