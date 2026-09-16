import { Exam, ExamAttempt, ExamStats } from '../types';

export async function fetchExams(): Promise<(Exam & { attemptCount?: number; averageScore?: number })[]> {
  const res = await fetch('/api/exams');
  if (!res.ok) throw new Error('Failed to fetch exams');
  return res.json();
}

export async function fetchExam(id: string): Promise<Exam> {
  const res = await fetch(`/api/exams/${encodeURIComponent(id)}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Sorry, this exam could not be found.');
    throw new Error('Failed to load exam');
  }
  return res.json();
}

export async function createExam(payload: Partial<Exam>): Promise<Exam> {
  const res = await fetch('/api/exams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to create exam');
  }
  return res.json();
}

export async function updateExam(id: string, payload: Partial<Exam>): Promise<Exam> {
  const res = await fetch(`/api/exams/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to update exam');
  }
  return res.json();
}

export async function deleteExam(id: string): Promise<void> {
  const res = await fetch(`/api/exams/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete exam');
}

export async function duplicateExam(id: string): Promise<Exam> {
  const res = await fetch(`/api/exams/${encodeURIComponent(id)}/duplicate`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to duplicate exam');
  return res.json();
}

export async function checkAnswer(examId: string, questionId: string, selectedOptionId: string): Promise<{
  isCorrect: boolean;
  correctOptionId: string;
}> {
  const res = await fetch(`/api/exams/${encodeURIComponent(examId)}/check-answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId, selectedOptionId }),
  });
  if (!res.ok) throw new Error('Failed to check answer');
  return res.json();
}

export async function submitExam(
  examId: string,
  participantName: string,
  answers: Record<string, string>,
  timeTakenSeconds: number
): Promise<{ attempt: ExamAttempt; exam: Exam }> {
  const res = await fetch(`/api/exams/${encodeURIComponent(examId)}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantName, answers, timeTakenSeconds }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to submit exam');
  }
  return res.json();
}

export async function fetchExamStats(examId: string): Promise<ExamStats> {
  const res = await fetch(`/api/exams/${encodeURIComponent(examId)}/stats`);
  if (!res.ok) throw new Error('Failed to load exam statistics');
  return res.json();
}

export interface GenerateAIQuestionsParams {
  topic: string;
  numQuestions?: number;
  difficulty?: string;
  contextText?: string;
}

export interface GenerateAIQuestionsResponse {
  suggestedTitle?: string;
  suggestedDescription?: string;
  questions: Exam['questions'];
}

export async function generateQuestionsWithAI(params: GenerateAIQuestionsParams): Promise<GenerateAIQuestionsResponse> {
  const res = await fetch('/api/ai/generate-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to generate questions with AI');
  }
  return res.json();
}

export async function explainQuestionWithAI(params: {
  questionText: string;
  options: { id: string; text: string }[];
  selectedOptionId?: string;
  correctOptionId: string;
}): Promise<string> {
  const res = await fetch('/api/ai/explain-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to generate explanation');
  }
  const data = await res.json();
  return data.explanation || '';
}

