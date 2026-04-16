import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../src/store/useAppStore';

export default function OnboardingScreen() {
  const [name, setName] = useState('');
  const router = useRouter();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const hasValidName = /[A-Za-z]/.test(name);

  function handleStart() {
    if (!hasValidName) return;
    completeOnboarding(name.trim());
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to ASL Vision</Text>
          <Text style={styles.subtitle}>
            Learn American Sign Language one letter at a time. Start by signing your own name.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>What's your name?</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#555"
              autoFocus
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleStart}
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              !hasValidName && styles.buttonDisabled,
              pressed && hasValidName && styles.buttonPressed,
            ]}
            onPress={handleStart}
            disabled={!hasValidName}
          >
            <Text style={styles.buttonText}>Let's go</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  inner: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#aaa',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputGroup: {
    width: '100%',
    gap: 8,
    marginTop: 8,
  },
  label: {
    color: '#ccc',
    fontSize: 15,
  },
  input: {
    width: '100%',
    backgroundColor: '#1e1e1e',
    color: '#fff',
    fontSize: 18,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    paddingHorizontal: 56,
    borderRadius: 32,
  },
  buttonDisabled: { backgroundColor: '#2a4a6a', opacity: 0.5 },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
