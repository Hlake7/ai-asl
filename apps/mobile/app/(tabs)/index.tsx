import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/store/useAppStore';
import { UNIT_1 } from '../../src/data/lessons';

export default function HomeScreen() {
  const router = useRouter();
  const { userName, completedLessons } = useAppStore();
  const completedCount = Object.keys(completedLessons).length;
  const totalLessons = UNIT_1.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.greeting}>
          <Text style={styles.title}>ASL Vision</Text>
          {userName ? (
            <Text style={styles.subtitle}>Hey {userName}!</Text>
          ) : (
            <Text style={styles.subtitle}>Learn sign language one letter at a time</Text>
          )}
        </View>

        <View style={styles.cards}>
          <Pressable
            style={({ pressed }) => [styles.card, styles.cardLearn, pressed && styles.cardPressed]}
            onPress={() => router.push('/learn')}
          >
            <Text style={styles.cardEmoji}>📚</Text>
            <Text style={styles.cardTitle}>Learn</Text>
            <Text style={styles.cardSub}>
              {completedCount} / {totalLessons} lessons
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.card, styles.cardTranslate, pressed && styles.cardPressed]}
            onPress={() => router.push('/translate')}
          >
            <Text style={styles.cardEmoji}>✋</Text>
            <Text style={styles.cardTitle}>Translate</Text>
            <Text style={styles.cardSub}>Free practice</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 32,
  },
  greeting: { gap: 6 },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#888',
    fontSize: 16,
  },
  cards: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    borderRadius: 18,
    padding: 20,
    gap: 8,
    minHeight: 140,
    justifyContent: 'flex-end',
  },
  cardLearn: { backgroundColor: '#1a2a3a' },
  cardTranslate: { backgroundColor: '#1a2a1a' },
  cardPressed: { opacity: 0.8 },
  cardEmoji: { fontSize: 32 },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  cardSub: {
    color: '#888',
    fontSize: 13,
  },
});
