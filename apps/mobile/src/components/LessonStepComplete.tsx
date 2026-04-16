import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LessonStepCompleteProps {
  lessonTitle: string;
  onDone: () => void;
}

export function LessonStepComplete({ lessonTitle, onDone }: LessonStepCompleteProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.heading}>Lesson complete!</Text>
        <Text style={styles.title}>{lessonTitle}</Text>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onDone}
        >
          <Text style={styles.buttonText}>Back to Lessons</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 64,
  },
  heading: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
  },
  title: {
    color: '#aaa',
    fontSize: 17,
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
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
