import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type LevelResult = { language: string; level: string };

export default function OnboardingResult() {
  const [results, setResults] = useState<LevelResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, []);

  async function loadResults() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_levels')
      .select('language, level')
      .eq('user_id', user.id);

    setResults(data || []);
    setLoading(false);
  }

  const langNames: Record<string, string> = { en: 'Английский', ky: 'Кыргызский' };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText>Загрузка...</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>Твой результат</ThemedText>

        {results.map((result) => (
          <ThemedView key={result.language} type="backgroundElement" style={styles.card}>
            <ThemedText style={styles.langName}>{langNames[result.language]}</ThemedText>
            <ThemedText type="title" style={styles.levelText}>{result.level}</ThemedText>
          </ThemedView>
        ))}

        <Pressable style={styles.button} onPress={() => router.replace('/')}>
          <ThemedText style={styles.buttonText}>Начать обучение</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  title: { textAlign: 'center', marginBottom: 16 },
  card: { padding: 20, borderRadius: 12, alignItems: 'center', gap: 8 },
  langName: { fontSize: 16, opacity: 0.7 },
  levelText: { fontSize: 32 },
  button: {
    backgroundColor: '#3B82F6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: 'white', fontWeight: 'bold' },
});
