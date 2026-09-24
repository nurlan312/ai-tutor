import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type Message = { id: string; role: 'user' | 'assistant'; content: string };

export default function Chat() {
  const [language, setLanguage] = useState<string>('en');
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    loadLanguages();
  }, []);

  useEffect(() => {
    if (language) loadHistory();
  }, [language]);

  async function loadLanguages() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('target_languages')
      .eq('id', user.id)
      .single();
    const langs = profile?.target_languages || ['en'];
    setAvailableLanguages(langs);
    setLanguage(langs[0]);
  }

  async function loadHistory() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('chat_messages')
      .select('id, role, content')
      .eq('user_id', user.id)
      .eq('language', language)
      .order('created_at', { ascending: true })
      .limit(50);
    setMessages(data || []);
  }

  async function handleSend() {
    if (!input.trim() || sending) return;
    setErrorMsg('');

    const userMessage: Message = { id: 'temp-' + Date.now(), role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = input;
    setInput('');
    setSending(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setErrorMsg('Сессия не найдена, войди заново');
      setSending(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('chat-with-tutor', {
        body: { message: messageToSend, language },
      });

      if (error) {
        console.error('Function error:', error);
        setErrorMsg('Ошибка при обращении к ИИ: ' + error.message);
        setSending(false);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: 'temp-' + Date.now(), role: 'assistant', content: data.reply },
      ]);
    } catch (e: any) {
      setErrorMsg('Ошибка: ' + e.message);
    }

    setSending(false);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {availableLanguages.length > 1 && (
          <ThemedView style={styles.langSwitch}>
            {availableLanguages.map((lang) => (
              <Pressable
                key={lang}
                style={[styles.langButton, language === lang && styles.langButtonActive]}
                onPress={() => setLanguage(lang)}>
                <ThemedText style={language === lang ? styles.langTextActive : styles.langText}>
                  {lang === 'en' ? 'Английский' : 'Кыргызский'}
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>
        )}

        {errorMsg ? <ThemedText style={styles.error}>{errorMsg}</ThemedText> : null}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <ThemedView
              type={item.role === 'user' ? 'backgroundSelected' : 'backgroundElement'}
              style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
              <ThemedText>{item.content}</ThemedText>
            </ThemedView>
          )}
        />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ThemedView style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Напиши сообщение..."
              placeholderTextColor="#888"
              value={input}
              onChangeText={setInput}
              editable={!sending}
              onSubmitEditing={handleSend}
            />
            <Pressable style={styles.sendButton} onPress={handleSend} disabled={sending}>
              <ThemedText style={styles.sendButtonText}>{sending ? '...' : 'Отправить'}</ThemedText>
            </Pressable>
          </ThemedView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  langSwitch: { flexDirection: 'row', gap: 8, padding: 12 },
  langButton: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: '#ccc' },
  langButtonActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  langText: { fontSize: 13 },
  langTextActive: { fontSize: 13, color: 'white', fontWeight: 'bold' },
  error: { color: '#ef4444', textAlign: 'center', paddingHorizontal: 16 },
  messagesList: { padding: 16, gap: 10 },
  bubble: { padding: 12, borderRadius: 14, maxWidth: '80%' },
  bubbleUser: { alignSelf: 'flex-end' },
  bubbleAssistant: { alignSelf: 'flex-start' },
  inputRow: { flexDirection: 'row', padding: 12, gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
  },
  sendButton: { backgroundColor: '#3B82F6', borderRadius: 20, paddingHorizontal: 18, justifyContent: 'center' },
  sendButtonText: { color: 'white', fontWeight: 'bold' },
});
