import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface LessonStepReviewIntroProps {
  letters: string[];
  onContinue: () => void;
}

export function LessonStepReviewIntro({ letters, onContinue }: LessonStepReviewIntroProps) {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.heading}>Time to review!</Text>
        <Text style={styles.subheading}>Sign each letter one more time:</Text>
        <View style={styles.letterRow}>
          {letters.map((l) => (
            <View key={l} style={styles.letterBadge}>
              <Text style={styles.letterText}>{l}</Text>
            </View>
          ))}
        </View>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onContinue}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 16,
  },
  heading: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
  },
  subheading: {
    color: '#aaa',
    fontSize: 15,
    textAlign: 'center',
  },
  letterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 8,
  },
  letterBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 32,
  },
  buttonPressed: { opacity: 0.8 },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
