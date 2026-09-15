import { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSignUp() {
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg('Заполни email и пароль');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      console.error('SignUp error:', error);
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: data.user.id, target_languages: [] });

      if (profileError) {
        console.error('Profile insert error:', profileError);
        setErrorMsg('Аккаунт создан, но профиль не сохранён: ' + profileError.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);

    if (!data.session) {
      setErrorMsg('Проверь почту — нужно подтвердить email перед входом.');
      return;
    }

    router.replace('/');
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Регистрация</ThemedText>

      {errorMsg ? <ThemedText style={styles.error}>{errorMsg}</ThemedText> : null}

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Пароль"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable style={styles.button} onPress={handleSignUp} disabled={loading}>
        <ThemedText style={styles.buttonText}>
          {loading ? 'Загрузка...' : 'Зарегистрироваться'}
        </ThemedText>
      </Pressable>

      <Pressable onPress={() => router.push('/auth/sign-in')}>
        <ThemedText type="link">Уже есть аккаунт? Войти</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { textAlign: 'center', marginBottom: 16 },
  error: { color: '#ef4444', textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontWeight: 'bold' },
});
