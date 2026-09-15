import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type Question = {
  question: string;
  options: string[];
  correctIndex: number;
  level: string;
};

const EN_QUESTIONS: Question[] = [
  { question: "She ___ to school every day.", options: ["go", "goes", "going", "went"], correctIndex: 1, level: 'A1' },
  { question: "I ___ my homework yesterday.", options: ["do", "did", "done", "doing"], correctIndex: 1, level: 'A2' },
  { question: "If I ___ more time, I would travel more.", options: ["have", "had", "having", "has"], correctIndex: 1, level: 'B1' },
  { question: "By next year, she ___ here for a decade.", options: ["will work", "will have worked", "works", "worked"], correctIndex: 1, level: 'B2' },
  { question: "Choose the correct synonym for 'meticulous':", options: ["careless", "thorough", "quick", "loud"], correctIndex: 1, level: 'C1' },
];

const KY_QUESTIONS: Question[] = [
  { question: "«Салам» деген эмне маанини билдирет?", options: ["Кош бол", "Салам", "Рахмат", "Ооба"], correctIndex: 1, level: 'начальный' },
  { question: "«Мен ... окуучумун» — бош орунду толтур: «мектепте»", options: ["мектеп", "мектепте", "мектепке", "мектептен"], correctIndex: 1, level: 'бытовой' },
];

export default function OnboardingTest() {
  const [languages, setLanguages] = useState<string[]>([]);
  const [currentLangIndex, setCurrentLangIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLanguages();
  }, []);

  async function loadLanguages() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/auth/sign-in');
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('target_languages')
      .eq('id', user.id)
      .single();

    setLanguages(profile?.target_languages || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText>Загрузка...</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const currentLang = languages[currentLangIndex];
  const questions = currentLang === 'en' ? EN_QUESTIONS : KY_QUESTIONS;
  const question = questions[currentQuestion];

  async function handleAnswer(selectedIndex: number) {
    const isCorrect = selectedIndex === question.correctIndex;
    const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;

    if (currentQuestion + 1 < questions.length) {
      setCorrectCount(newCorrectCount);
      setCurrentQuestion(currentQuestion + 1);
      return;
    }

    const level = calculateLevel(currentLang, newCorrectCount, questions.length);
    await saveLevel(currentLang, level);

    if (currentLangIndex + 1 < languages.length) {
      setCurrentLangIndex(currentLangIndex + 1);
      setCurrentQuestion(0);
      setCorrectCount(0);
    } else {
      router.replace('/onboarding/result');
    }
  }

  function calculateLevel(lang: string, correct: number, total: number): string {
    const ratio = correct / total;
    if (lang === 'en') {
      if (ratio >= 0.8) return 'C1';
      if (ratio >= 0.6) return 'B2';
      if (ratio >= 0.4) return 'B1';
      if (ratio >= 0.2) return 'A2';
      return 'A1';
    }
    if (ratio >= 0.5) return 'бытовой';
    return 'начальный';
  }

  async function saveLevel(lang: string, level: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_levels').upsert({
      user_id: user.id,
      language: lang,
      level,
    }, { onConflict: 'user_id,language' });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="small" style={styles.progress}>
          {currentLang === 'en' ? 'Английский' : 'Кыргызский'} · Вопрос {currentQuestion + 1} из {questions.length}
        </ThemedText>

        <ThemedText type="title" style={styles.question}>
          {question.question}
        </ThemedText>

        {question.options.map((option, index) => (
          <Pressable key={index} style={styles.option} onPress={() => handleAnswer(index)}>
            <ThemedText style={styles.optionText}>{option}</ThemedText>
          </Pressable>
        ))}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  progress: { textAlign: 'center', opacity: 0.6 },
  question: { textAlign: 'center', marginBottom: 16 },
  option: {
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  optionText: { fontSize: 16 },
});
