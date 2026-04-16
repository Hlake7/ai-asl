import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/store/useAppStore';
import { UNIT_1 } from '../../src/data/lessons';

export default function LearnIndexScreen() {
  const router = useRouter();
  const { completedLessons, isLessonUnlocked } = useAppStore();
  const completedCount = Object.keys(completedLessons).length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.unit}>Unit 1 — The Alphabet</Text>
          <Text style={styles.progress}>{completedCount} of {UNIT_1.length} lessons complete</Text>
        </View>

        {UNIT_1.map((lesson) => {
          const unlocked = isLessonUnlocked(lesson.id);
          const done = lesson.id in completedLessons;

          return (
            <Pressable
              key={lesson.id}
              style={({ pressed }) => [
                styles.card,
                !unlocked && styles.cardLocked,
                pressed && unlocked && styles.cardPressed,
              ]}
              onPress={() => unlocked && router.push(`/learn/${lesson.id}`)}
              disabled={!unlocked}
            >
              <View style={styles.cardLeft}>
                <Text style={[styles.cardTitle, !unlocked && styles.textMuted]}>
                  {lesson.title}
                </Text>
                {Array.isArray(lesson.letters) && (
                  <Text style={[styles.cardLetters, !unlocked && styles.textMuted]}>
                    {lesson.letters.join(' · ')}
                  </Text>
                )}
              </View>
              <Text style={styles.cardIcon}>
                {done ? '✓' : unlocked ? '›' : '🔒'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  scroll: { padding: 20, gap: 12 },
  header: { marginBottom: 8, gap: 4 },
  unit: { color: '#fff', fontSize: 20, fontWeight: '700' },
  progress: { color: '#888', fontSize: 14 },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLocked: { opacity: 0.45 },
  cardPressed: { opacity: 0.75 },
  cardLeft: { flex: 1, gap: 4 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cardLetters: { color: '#888', fontSize: 13 },
  textMuted: { color: '#666' },
  cardIcon: { color: '#4A90E2', fontSize: 20, fontWeight: '700', marginLeft: 12 },
});
