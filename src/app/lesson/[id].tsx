import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type Lesson = {
  id: string;
  title: string;
  explanation: string;
  examples: string[];
};

type Exercise = {
  id: string;
  type: string;
  question: string;
  options: string[];
  correct_answer: string;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [step, setStep] = useState<'explanation' | 'exercises' | 'done'>('explanation');
  const [currentExercise, setCurrentExercise] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLesson();
  }, [id]);

  async function loadLesson() {
    const { data: lessonData } = await supabase
      .from('lessons')
      .select('id, title, explanation, examples')
      .eq('id', id)
      .single();

    const { data: exercisesData } = await supabase
      .from('exercises')
      .select('id, type, question, options, correct_answer')
      .eq('lesson_id', id);

    setLesson(lessonData);
    setExercises(exercisesData || []);
    setLoading(false);
  }

  async function handleAnswer(option: string) {
    setSelectedAnswer(option);
  }

  async function saveProgress(score: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && lesson) {
      await supabase.from('user_progress').upsert(
        {
          user_id: user.id,
          lesson_id: lesson.id,
          completed: true,
          score,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,lesson_id' }
      );
    }
  }

  async function handleNext() {
    const exercise = exercises[currentExercise];
    const isCorrect =
      exercise.type === 'fill_blank'
        ? normalize(selectedAnswer ?? '') === normalize(exercise.correct_answer)
        : selectedAnswer === exercise.correct_answer;
    const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;

    if (!isCorrect) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_mistakes').insert({
          user_id: user.id,
          exercise_id: exercise.id,
          user_answer: selectedAnswer,
        });
      }
    }

    if (currentExercise + 1 < exercises.length) {
      setCorrectCount(newCorrectCount);
      setCurrentExercise(currentExercise + 1);
      setSelectedAnswer(null);
      return;
    }

    await saveProgress(Math.round((newCorrectCount / exercises.length) * 100));
    setCorrectCount(newCorrectCount);
    setStep('done');
  }

  if (loading || !lesson) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText>Загрузка...</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (step === 'explanation') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <ThemedText type="title" style={styles.title}>{lesson.title}</ThemedText>
            <ThemedText style={styles.explanation}>{lesson.explanation}</ThemedText>

            <ThemedText type="small" style={styles.examplesTitle}>Примеры:</ThemedText>
            {lesson.examples.map((ex, i) => (
              <ThemedText key={i} style={styles.example}>• {ex}</ThemedText>
            ))}
          </ScrollView>

          <Pressable
            style={styles.button}
            onPress={() => {
              if (exercises.length > 0) {
                setStep('exercises');
              } else {
                saveProgress(100).then(() => setStep('done'));
              }
            }}>
            <ThemedText style={styles.buttonText}>
              {exercises.length > 0 ? 'К упражнениям' : 'Завершить урок'}
            </ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (step === 'exercises' && exercises.length > 0) {
    const exercise = exercises[currentExercise];
    const canProceed = !!selectedAnswer && selectedAnswer.trim().length > 0;

    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="small" style={styles.progress}>
            Вопрос {currentExercise + 1} из {exercises.length}
          </ThemedText>
          <ThemedText type="title" style={styles.question}>{exercise.question}</ThemedText>

          {exercise.type === 'fill_blank' ? (
            <TextInput
              style={styles.textInput}
              placeholder="Введи ответ..."
              placeholderTextColor="#888"
              value={selectedAnswer ?? ''}
              onChangeText={setSelectedAnswer}
              autoCapitalize="none"
              autoCorrect={false}
            />
          ) : (
            exercise.options.map((option) => {
              const isSelected = selectedAnswer === option;
              return (
                <Pressable
                  key={option}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => handleAnswer(option)}>
                  <ThemedText>{option}</ThemedText>
                </Pressable>
              );
            })
          )}

          <Pressable
            style={[styles.button, !canProceed && styles.buttonDisabled]}
            onPress={handleNext}
            disabled={!canProceed}>
            <ThemedText style={styles.buttonText}>Далее</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>Урок пройден! 🎉</ThemedText>
        {exercises.length > 0 && (
          <ThemedText style={styles.explanation}>
            Правильных ответов: {correctCount} из {exercises.length}
          </ThemedText>
        )}
        <Pressable style={styles.button} onPress={() => router.replace('/lessons')}>
          <ThemedText style={styles.buttonText}>К списку уроков</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  scroll: { gap: 12, paddingBottom: 16 },
  title: { textAlign: 'center' },
  explanation: { fontSize: 15, lineHeight: 22 },
  examplesTitle: { opacity: 0.6, marginTop: 8 },
  example: { fontSize: 15 },
  progress: { textAlign: 'center', opacity: 0.6 },
  question: { textAlign: 'center' },
  option: {
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  optionSelected: { borderColor: '#3B82F6', backgroundColor: '#3B82F620' },
  textInput: {
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: 'white', fontWeight: 'bold' },
});
