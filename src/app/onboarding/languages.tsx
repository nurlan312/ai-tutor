import { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const LANGUAGES = [
  { code: 'en', label: 'Английский' },
  { code: 'ky', label: 'Кыргызский' },
];

export default function ChooseLanguages() {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  function toggle(code: string) {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  async function handleContinue() {
    setErrorMsg('');
    if (selected.length === 0) {
      setErrorMsg('Выбери хотя бы один язык');
      return;
    }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMsg('Сессия не найдена, войди заново');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ target_languages: selected })
      .eq('id', user.id);

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    router.replace('/');
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Какой язык хочешь изучать?
      </ThemedText>

      {errorMsg ? <ThemedText style={styles.error}>{errorMsg}</ThemedText> : null}

      <View style={styles.options}>
        {LANGUAGES.map((lang) => {
          const isSelected = selected.includes(lang.code);
          return (
            <Pressable
              key={lang.code}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => toggle(lang.code)}>
              <ThemedText style={isSelected ? styles.optionTextSelected : styles.optionText}>
                {lang.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.button} onPress={handleContinue} disabled={loading}>
        <ThemedText style={styles.buttonText}>
          {loading ? 'Сохраняю...' : 'Продолжить'}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 24 },
  title: { textAlign: 'center' },
  error: { color: '#ef4444', textAlign: 'center' },
  options: { gap: 12 },
  option: {
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  optionSelected: { borderColor: '#3B82F6', backgroundColor: '#3B82F620' },
  optionText: { fontSize: 16 },
  optionTextSelected: { fontSize: 16, fontWeight: 'bold', color: '#3B82F6' },
  button: {
    backgroundColor: '#3B82F6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontWeight: 'bold' },
});
