import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type Lesson = {
  id: string;
  language: string;
  level: string;
  title: string;
};

export default function Lessons() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadLessons();
    }, [])
  );

  async function loadLessons() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('target_languages')
      .eq('id', user.id)
      .single();

    const languages = profile?.target_languages || [];

    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('id, language, level, title')
      .in('language', languages.length > 0 ? languages : ['en'])
      .order('order_index');

    const { data: progressData } = await supabase
      .from('user_progress')
      .select('lesson_id')
      .eq('user_id', user.id)
      .eq('completed', true);

    setLessons(lessonsData || []);
    setCompletedIds((progressData || []).map((p) => p.lesson_id));
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
        <ThemedText type="title" style={styles.title}>Уроки</ThemedText>

        <FlatList
          data={lessons}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isDone = completedIds.includes(item.id);
            return (
              <Pressable
                style={styles.card}
                onPress={() => router.push(`/lesson/${item.id}`)}>
                <ThemedView type="backgroundElement" style={styles.cardInner}>
                  <ThemedText type="small" style={styles.meta}>
                    {langNames[item.language]} · {item.level} {isDone ? '· ✅' : ''}
                  </ThemedText>
                  <ThemedText style={styles.cardTitle}>{item.title}</ThemedText>
                </ThemedView>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  title: { marginBottom: 16 },
  list: { gap: 12, paddingBottom: 32 },
  card: {},
  cardInner: { padding: 16, borderRadius: 12, gap: 4 },
  meta: { opacity: 0.6 },
  cardTitle: { fontSize: 17, fontWeight: 'bold' },
});
