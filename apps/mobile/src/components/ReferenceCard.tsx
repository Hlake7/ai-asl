import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface ReferenceCardProps {
  letter: string;
  hint: string;
  imageUri?: string;
  onContinue: () => void;
}

export function ReferenceCard({ letter, hint, imageUri, onContinue }: ReferenceCardProps) {
  return (
    <Pressable style={styles.overlay} onPress={onContinue}>
      <View style={styles.card}>
        <Text style={styles.letter}>{letter}</Text>

        <View style={styles.imageArea}>
          {imageUri ? (
            <Image
              testID="letter-image"
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : (
            <View testID="image-placeholder" style={styles.placeholder}>
              <Text style={styles.placeholderText}>✋</Text>
              <Text style={styles.placeholderLabel}>Image coming soon</Text>
            </View>
          )}
        </View>

        <Text style={styles.hint}>{hint}</Text>
        <Text style={styles.tapHint}>Tap to continue</Text>
      </View>
    </Pressable>
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
  letter: {
    color: '#fff',
    fontSize: 80,
    fontWeight: '700',
    lineHeight: 88,
  },
  imageArea: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 48,
  },
  placeholderLabel: {
    color: '#666',
    fontSize: 13,
  },
  hint: {
    color: '#ccc',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  tapHint: {
    color: '#555',
    fontSize: 13,
    marginTop: 4,
  },
});
