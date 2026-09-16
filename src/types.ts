export interface QuestionOption {
  id: string; // 'A' | 'B' | 'C' | 'D' or uuid
  text: string;
}

export interface Question {
  id: string;
  questionText: string;
  options: QuestionOption[];
  correctOptionId: string; // 'A' | 'B' | 'C' | 'D'
  explanation?: string;
}

export interface ExamSettings {
  timeLimitMinutes: number; // 0 = OFF, 5, 10, 15, 30, or custom
  passingScorePercent: number; // e.g. 70
  showAnswerImmediately: boolean; // default true
  randomizeQuestions: boolean; // default false
  randomizeAnswers: boolean; // default false
  allowRetake: boolean; // default true
  requireParticipantName: boolean; // default true
  showFinalScore: boolean; // default true
  showAnswerReview: boolean; // default true
}

export interface Exam {
  id: string; // unique code e.g. "ABC123", "CMP101"
  title: string;
  description: string;
  questions: Question[];
  settings: ExamSettings;
  createdAt: string;
  updatedAt: string;
  isPublished: boolean;
}

export interface ExamAttemptAnswer {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  correctOptionId: string;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  participantName: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  scorePercent: number;
  passed: boolean;
  timeTakenSeconds: number;
  submittedAt: string;
  answers: ExamAttemptAnswer[];
}

export interface ExamStats {
  totalAttempts: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  recentAttempts: ExamAttempt[];
}

export type ActivePage = 
  | { type: 'home' }
  | { type: 'create'; editExamId?: string }
  | { type: 'my-exams' }
  | { type: 'share'; examId: string }
  | { type: 'take-exam'; examId: string }
  | { type: 'result'; attempt: ExamAttempt; exam: Exam }
  | { type: 'stats'; examId: string };
