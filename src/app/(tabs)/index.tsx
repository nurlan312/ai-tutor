
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { Spacing } from '@/constants/theme';

type ViewState = 'loading' | 'guest' | 'needs-language' | 'needs-test' | 'ready';

export default function HomeScreen() {
  const [state, setState] = useState<ViewState>('loading');

  useEffect(() => {
    checkUserState();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkUserState();
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function checkUserState() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setState('guest');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('target_languages')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.target_languages || profile.target_languages.length === 0) {
      setState('needs-language');
      return;
    }

    const { data: levels } = await supabase
      .from('user_levels')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (!levels || levels.length === 0) {
      setState('needs-test');
      return;
    }

    setState('ready');
  }

  if (state === 'loading') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText>Загрузка...</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (state === 'guest') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="title" style={styles.title}>
            ИИ-репетитор
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Учи английский и кыргызский язык с персональным ИИ-учителем.
            Диалоги, уроки, проверка ошибок — в удобное время, в своём темпе.
          </ThemedText>
          <Pressable style={styles.button} onPress={() => router.push('/auth/sign-up')}>
            <ThemedText style={styles.buttonText}>Начать обучение</ThemedText>
          </Pressable>
          <Pressable onPress={() => router.push('/auth/sign-in')}>
            <ThemedText type="link">Уже есть аккаунт? Войти</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (state === 'needs-language') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="title" style={styles.title}>
            Почти готово
          </ThemedText>
          <Pressable
            style={styles.button}
            onPress={() => router.push('/onboarding/languages')}>
            <ThemedText style={styles.buttonText}>Выбрать язык</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (state === 'needs-test') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="title" style={styles.title}>
            Определим твой уровень
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Пройди короткий тест, чтобы получить персональный план обучения.
          </ThemedText>
          <Pressable style={styles.button} onPress={() => router.push('/onboarding/test')}>
            <ThemedText style={styles.buttonText}>Пройти тест</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          С возвращением!
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Здесь будет твой план обучения и уроки.
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', opacity: 0.7 },
  button: {
    backgroundColor: '#3B82F6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontWeight: 'bold' },
});
