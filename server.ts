import express from 'express';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Robust multi-model fallback and retry handler for high demand spikes (503 / 429)
const modelHealthStatus: Record<string, number> = {};

async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
}) {
  const ai = getAI();
  // Models in fallback priority order; prioritize flash-lite which has highest throughput & low latency
  const baseModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
  
  // Sort models putting any recently overloaded model (within last 3 minutes) to the end
  const now = Date.now();
  const models = [...baseModels].sort((a, b) => {
    const aCooling = (modelHealthStatus[a] || 0) > now;
    const bCooling = (modelHealthStatus[b] || 0) > now;
    if (aCooling && !bCooling) return 1;
    if (!aCooling && bCooling) return -1;
    return 0;
  });

  let lastError: any = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      // Clear cooldown on success
      delete modelHealthStatus[model];
      return response;
    } catch (err: any) {
      lastError = err;
      const raw = err?.message || String(err);

      const isTransient =
        raw.includes('503') ||
        raw.includes('UNAVAILABLE') ||
        raw.includes('high demand') ||
        raw.includes('429') ||
        raw.includes('RESOURCE_EXHAUSTED') ||
        raw.includes('fetch failed');

      if (isTransient) {
        // Mark this model as needing 3-minute cooldown
        modelHealthStatus[model] = Date.now() + 180000;
      }

      if (isTransient && i < models.length - 1) {
        // Wait briefly before trying the next available model
        await new Promise((resolve) => setTimeout(resolve, 300 * (i + 1)));
        continue;
      }
    }
  }

  throw lastError;
}

function formatAiErrorMessage(err: any): string {
  const raw = err?.message || String(err);
  if (raw.includes('503') || raw.includes('UNAVAILABLE') || raw.includes('high demand')) {
    return 'The AI model is currently experiencing high demand. Please click Retry in a few moments.';
  }
  if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
    return 'AI request limit reached temporarily. Please wait a moment and try again.';
  }
  if (raw.includes('GEMINI_API_KEY')) {
    return 'GEMINI_API_KEY environment variable is not configured.';
  }
  try {
    const match = raw.match(/\{"error":\s*\{.*?"message":\s*"([^"]+)"/);
    if (match && match[1]) {
      return match[1];
    }
  } catch (e) {}
  return raw;
}

app.use(express.json());

const DATA_DIR = path.join(process.cwd(), 'data');
const EXAMS_FILE = path.join(DATA_DIR, 'exams.json');
const ATTEMPTS_FILE = path.join(DATA_DIR, 'attempts.json');

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface QuestionOption {
  id: string;
  text: string;
}

interface Question {
  id: string;
  questionText: string;
  options: QuestionOption[];
  correctOptionId: string;
}

interface ExamSettings {
  timeLimitMinutes: number;
  passingScorePercent: number;
  showAnswerImmediately: boolean;
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  allowRetake: boolean;
  requireParticipantName: boolean;
  showFinalScore: boolean;
  showAnswerReview: boolean;
}

interface Exam {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  settings: ExamSettings;
  createdAt: string;
  updatedAt: string;
  isPublished: boolean;
}

interface ExamAttemptAnswer {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  correctOptionId: string;
}

interface ExamAttempt {
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

const DEFAULT_DEMO_EXAM: Exam = {
  id: 'DEMO01',
  title: 'Computer Basic Knowledge Test',
  description: 'Test your basic computer knowledge with this quick online quiz.',
  settings: {
    timeLimitMinutes: 10,
    passingScorePercent: 70,
    showAnswerImmediately: true,
    randomizeQuestions: false,
    randomizeAnswers: false,
    allowRetake: true,
    requireParticipantName: true,
    showFinalScore: true,
    showAnswerReview: true,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isPublished: true,
  questions: [
    {
      id: 'q1',
      questionText: 'Who is the father of computer?',
      options: [
        { id: 'A', text: 'Charles Babbage' },
        { id: 'B', text: 'Michael Ford' },
        { id: 'C', text: 'Charles Dakhirm' },
        { id: 'D', text: 'All of the above' }
      ],
      correctOptionId: 'A'
    },
    {
      id: 'q2',
      questionText: 'What does CPU stand for?',
      options: [
        { id: 'A', text: 'Central Process Unit' },
        { id: 'B', text: 'Central Processing Unit' },
        { id: 'C', text: 'Computer Personal Unit' },
        { id: 'D', text: 'Central Processor Universal' }
      ],
      correctOptionId: 'B'
    },
    {
      id: 'q3',
      questionText: 'Which of the following is considered primary volatile memory?',
      options: [
        { id: 'A', text: 'Hard Disk Drive (HDD)' },
        { id: 'B', text: 'USB Flash Drive' },
        { id: 'C', text: 'Random Access Memory (RAM)' },
        { id: 'D', text: 'Solid State Drive (SSD)' }
      ],
      correctOptionId: 'C'
    },
    {
      id: 'q4',
      questionText: 'Which device is primarily used as an input device for typing text?',
      options: [
        { id: 'A', text: 'Monitor' },
        { id: 'B', text: 'Keyboard' },
        { id: 'C', text: 'Speaker' },
        { id: 'D', text: 'Laser Printer' }
      ],
      correctOptionId: 'B'
    },
    {
      id: 'q5',
      questionText: 'Which operating system is created and maintained by Apple Inc.?',
      options: [
        { id: 'A', text: 'Windows' },
        { id: 'B', text: 'Ubuntu Linux' },
        { id: 'C', text: 'macOS' },
        { id: 'D', text: 'Red Hat Enterprise' }
      ],
      correctOptionId: 'C'
    }
  ]
};

function readExams(): Exam[] {
  try {
    if (!fs.existsSync(EXAMS_FILE)) {
      fs.writeFileSync(EXAMS_FILE, JSON.stringify([DEFAULT_DEMO_EXAM], null, 2), 'utf-8');
      return [DEFAULT_DEMO_EXAM];
    }
    const data = fs.readFileSync(EXAMS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      fs.writeFileSync(EXAMS_FILE, JSON.stringify([DEFAULT_DEMO_EXAM], null, 2), 'utf-8');
      return [DEFAULT_DEMO_EXAM];
    }
    return parsed;
  } catch (err) {
    console.error('Error reading exams file:', err);
    return [DEFAULT_DEMO_EXAM];
  }
}

function writeExams(exams: Exam[]): void {
  try {
    fs.writeFileSync(EXAMS_FILE, JSON.stringify(exams, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing exams file:', err);
  }
}

function readAttempts(): ExamAttempt[] {
  try {
    if (!fs.existsSync(ATTEMPTS_FILE)) {
      fs.writeFileSync(ATTEMPTS_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const data = fs.readFileSync(ATTEMPTS_FILE, 'utf-8');
    return JSON.parse(data) || [];
  } catch (err) {
    console.error('Error reading attempts file:', err);
    return [];
  }
}

function writeAttempts(attempts: ExamAttempt[]): void {
  try {
    fs.writeFileSync(ATTEMPTS_FILE, JSON.stringify(attempts, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing attempts file:', err);
  }
}

// Generate unique readable exam code, e.g. "ABC123"
function generateExamId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude similar chars (0, O, 1, I)
  const exams = readExams();
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (exams.some(e => e.id === code));
  return code;
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// List all exams
app.get('/api/exams', (req, res) => {
  const exams = readExams();
  const attempts = readAttempts();

  const examsWithStats = exams.map(exam => {
    const examAttempts = attempts.filter(a => a.examId === exam.id);
    const totalAttempts = examAttempts.length;
    const avgScore = totalAttempts > 0 
      ? Math.round(examAttempts.reduce((sum, a) => sum + a.scorePercent, 0) / totalAttempts) 
      : 0;
    
    return {
      ...exam,
      attemptCount: totalAttempts,
      averageScore: avgScore,
    };
  });

  res.json(examsWithStats);
});

// Get a single exam by ID
app.get('/api/exams/:id', (req, res) => {
  const { id } = req.params;
  const exams = readExams();
  const exam = exams.find(e => e.id.toLowerCase() === id.toLowerCase());

  if (!exam) {
    res.status(404).json({ error: 'Sorry, this exam could not be found.' });
    return;
  }

  res.json(exam);
});

// Create exam
app.post('/api/exams', (req, res) => {
  const { title, description, questions, settings } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ error: 'Exam title cannot be empty.' });
    return;
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    res.status(400).json({ error: 'Exam must contain at least one question.' });
    return;
  }

  // Validate questions
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qNum = i + 1;

    if (!q.questionText || !q.questionText.trim()) {
      res.status(400).json({ error: `Question ${qNum} text cannot be empty.` });
      return;
    }

    if (!Array.isArray(q.options) || q.options.length < 2) {
      res.status(400).json({ error: `Question ${qNum} must have answer options.` });
      return;
    }

    for (let j = 0; j < q.options.length; j++) {
      const opt = q.options[j];
      if (!opt.text || !opt.text.trim()) {
        res.status(400).json({ error: `Option ${opt.id || j + 1} for Question ${qNum} cannot be empty.` });
        return;
      }
    }

    if (!q.correctOptionId) {
      res.status(400).json({ error: `Please select the correct answer for Question ${qNum}.` });
      return;
    }

    const validOption = q.options.some((opt: QuestionOption) => opt.id === q.correctOptionId);
    if (!validOption) {
      res.status(400).json({ error: `Selected correct answer for Question ${qNum} is invalid.` });
      return;
    }
  }

  const newExam: Exam = {
    id: generateExamId(),
    title: title.trim(),
    description: (description || '').trim(),
    questions: questions.map((q: any, idx: number) => ({
      id: q.id || `q_${Date.now()}_${idx}`,
      questionText: q.questionText.trim(),
      options: q.options.map((opt: any) => ({
        id: opt.id,
        text: opt.text.trim(),
      })),
      correctOptionId: q.correctOptionId,
    })),
    settings: {
      timeLimitMinutes: Number(settings?.timeLimitMinutes) || 0,
      passingScorePercent: Number(settings?.passingScorePercent) || 70,
      showAnswerImmediately: settings?.showAnswerImmediately !== false,
      randomizeQuestions: Boolean(settings?.randomizeQuestions),
      randomizeAnswers: Boolean(settings?.randomizeAnswers),
      allowRetake: settings?.allowRetake !== false,
      requireParticipantName: settings?.requireParticipantName !== false,
      showFinalScore: settings?.showFinalScore !== false,
      showAnswerReview: settings?.showAnswerReview !== false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPublished: true,
  };

  const exams = readExams();
  exams.unshift(newExam);
  writeExams(exams);

  res.status(201).json(newExam);
});

// Update exam
app.put('/api/exams/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, questions, settings } = req.body;

  const exams = readExams();
  const index = exams.findIndex(e => e.id.toLowerCase() === id.toLowerCase());

  if (index === -1) {
    res.status(404).json({ error: 'Exam not found.' });
    return;
  }

  if (!title || typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ error: 'Exam title cannot be empty.' });
    return;
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    res.status(400).json({ error: 'Exam must contain at least one question.' });
    return;
  }

  // Validate questions
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qNum = i + 1;
    if (!q.questionText || !q.questionText.trim()) {
      res.status(400).json({ error: `Question ${qNum} text cannot be empty.` });
      return;
    }
    if (!Array.isArray(q.options) || q.options.length < 2) {
      res.status(400).json({ error: `Question ${qNum} must have answer options.` });
      return;
    }
    for (let j = 0; j < q.options.length; j++) {
      const opt = q.options[j];
      if (!opt.text || !opt.text.trim()) {
        res.status(400).json({ error: `Option ${opt.id || j + 1} for Question ${qNum} cannot be empty.` });
        return;
      }
    }
    if (!q.correctOptionId) {
      res.status(400).json({ error: `Please select the correct answer for Question ${qNum}.` });
      return;
    }
  }

  const existing = exams[index];
  const updatedExam: Exam = {
    ...existing,
    title: title.trim(),
    description: (description || '').trim(),
    questions: questions.map((q: any, idx: number) => ({
      id: q.id || `q_${Date.now()}_${idx}`,
      questionText: q.questionText.trim(),
      options: q.options.map((opt: any) => ({
        id: opt.id,
        text: opt.text.trim(),
      })),
      correctOptionId: q.correctOptionId,
    })),
    settings: {
      ...existing.settings,
      ...(settings || {}),
    },
    updatedAt: new Date().toISOString(),
  };

  exams[index] = updatedExam;
  writeExams(exams);

  res.json(updatedExam);
});

// Delete exam
app.delete('/api/exams/:id', (req, res) => {
  const { id } = req.params;
  const exams = readExams();
  const filtered = exams.filter(e => e.id.toLowerCase() !== id.toLowerCase());

  if (filtered.length === exams.length) {
    res.status(404).json({ error: 'Exam not found.' });
    return;
  }

  writeExams(filtered);

  // Also remove associated attempts
  const attempts = readAttempts();
  const filteredAttempts = attempts.filter(a => a.examId.toLowerCase() !== id.toLowerCase());
  writeAttempts(filteredAttempts);

  res.json({ success: true, message: 'Exam deleted successfully.' });
});

// Duplicate exam
app.post('/api/exams/:id/duplicate', (req, res) => {
  const { id } = req.params;
  const exams = readExams();
  const source = exams.find(e => e.id.toLowerCase() === id.toLowerCase());

  if (!source) {
    res.status(404).json({ error: 'Exam not found.' });
    return;
  }

  const newExam: Exam = {
    ...source,
    id: generateExamId(),
    title: `${source.title} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  exams.unshift(newExam);
  writeExams(exams);

  res.status(201).json(newExam);
});

// Check individual answer (instant verification endpoint)
app.post('/api/exams/:id/check-answer', (req, res) => {
  const { id } = req.params;
  const { questionId, selectedOptionId } = req.body;

  const exams = readExams();
  const exam = exams.find(e => e.id.toLowerCase() === id.toLowerCase());

  if (!exam) {
    res.status(404).json({ error: 'Exam not found.' });
    return;
  }

  const question = exam.questions.find(q => q.id === questionId);
  if (!question) {
    res.status(404).json({ error: 'Question not found.' });
    return;
  }

  const isCorrect = question.correctOptionId === selectedOptionId;
  res.json({
    questionId,
    selectedOptionId,
    isCorrect,
    correctOptionId: question.correctOptionId,
  });
});

// Submit full exam attempt
app.post('/api/exams/:id/submit', (req, res) => {
  const { id } = req.params;
  const { participantName, answers, timeTakenSeconds } = req.body;

  const exams = readExams();
  const exam = exams.find(e => e.id.toLowerCase() === id.toLowerCase());

  if (!exam) {
    res.status(404).json({ error: 'Exam not found.' });
    return;
  }

  const answersObj = answers || {};
  let correctCount = 0;
  let wrongCount = 0;
  const detailedAnswers: ExamAttemptAnswer[] = [];

  for (const q of exam.questions) {
    const selected = answersObj[q.id];
    const isCorrect = selected === q.correctOptionId;
    if (isCorrect) {
      correctCount++;
    } else {
      wrongCount++;
    }
    detailedAnswers.push({
      questionId: q.id,
      selectedOptionId: selected || '',
      isCorrect,
      correctOptionId: q.correctOptionId,
    });
  }

  const totalQuestions = exam.questions.length;
  const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const passed = scorePercent >= (exam.settings.passingScorePercent || 0);

  const attempt: ExamAttempt = {
    id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    examId: exam.id,
    participantName: (participantName || 'Anonymous Participant').trim(),
    totalQuestions,
    correctAnswers: correctCount,
    wrongAnswers: wrongCount,
    scorePercent,
    passed,
    timeTakenSeconds: Number(timeTakenSeconds) || 0,
    submittedAt: new Date().toISOString(),
    answers: detailedAnswers,
  };

  const attempts = readAttempts();
  attempts.unshift(attempt);
  writeAttempts(attempts);

  res.status(201).json({
    attempt,
    exam: {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      settings: exam.settings,
      questions: exam.questions,
    }
  });
});

// Get exam statistics & attempt history
app.get('/api/exams/:id/stats', (req, res) => {
  const { id } = req.params;
  const exams = readExams();
  const exam = exams.find(e => e.id.toLowerCase() === id.toLowerCase());

  if (!exam) {
    res.status(404).json({ error: 'Exam not found.' });
    return;
  }

  const attempts = readAttempts().filter(a => a.examId.toLowerCase() === id.toLowerCase());
  const totalAttempts = attempts.length;

  if (totalAttempts === 0) {
    res.json({
      totalAttempts: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      passRate: 0,
      recentAttempts: [],
    });
    return;
  }

  const scores = attempts.map(a => a.scorePercent);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / totalAttempts);
  const highestScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);
  const passedCount = attempts.filter(a => a.passed).length;
  const passRate = Math.round((passedCount / totalAttempts) * 100);

  res.json({
    totalAttempts,
    averageScore: avgScore,
    highestScore,
    lowestScore,
    passRate,
    recentAttempts: attempts.slice(0, 50),
  });
});

// AI Question Generator
app.post('/api/ai/generate-questions', async (req, res) => {
  try {
    const { topic, numQuestions = 5, difficulty = 'Intermediate', contextText = '' } = req.body;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      res.status(400).json({ error: 'Please provide a topic or subject for the quiz questions.' });
      return;
    }

    const ai = getAI();
    const count = Math.min(Math.max(Number(numQuestions) || 5, 1), 10);

    const prompt = `Generate exactly ${count} high-quality multiple-choice questions for an online quiz/exam.
Topic / Subject: "${topic.trim()}"
Target Difficulty Level: "${difficulty}"
${contextText ? `Source Notes / Additional Context:\n"""\n${contextText.trim()}\n"""` : ''}

Requirements:
1. Each question must have exactly 4 answer choices with IDs "A", "B", "C", and "D".
2. Exactly 1 option must be the correct answer.
3. The questions should be clear, educational, factually accurate, and engaging.
4. Provide a brief explanation for each question explaining why the correct choice is right.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        systemInstruction: 'You are an experienced educator and test creator who crafts clear, high-quality multiple-choice questions.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedTitle: { type: Type.STRING, description: 'A suggested concise title for this quiz' },
            suggestedDescription: { type: Type.STRING, description: 'A brief description of this quiz' },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionText: { type: Type.STRING, description: 'The question text' },
                  options: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING, description: 'Choice identifier: A, B, C, or D' },
                        text: { type: Type.STRING, description: 'The option text' },
                      },
                      required: ['id', 'text'],
                    },
                  },
                  correctOptionId: { type: Type.STRING, description: 'A, B, C, or D' },
                  explanation: { type: Type.STRING, description: 'Why this answer is correct' },
                },
                required: ['questionText', 'options', 'correctOptionId'],
              },
            },
          },
          required: ['questions'],
        },
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);

    // Format questions with IDs
    const questions = (parsed.questions || []).map((q: any, index: number) => ({
      id: `ai_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
      questionText: q.questionText,
      options: (q.options || []).map((opt: any, oIdx: number) => ({
        id: opt.id || ['A', 'B', 'C', 'D'][oIdx],
        text: opt.text,
      })),
      correctOptionId: q.correctOptionId || 'A',
      explanation: q.explanation || '',
    }));

    res.json({
      suggestedTitle: parsed.suggestedTitle || '',
      suggestedDescription: parsed.suggestedDescription || '',
      questions,
    });
  } catch (err: any) {
    console.error('AI generate questions error:', err);
    res.status(503).json({
      error: formatAiErrorMessage(err),
    });
  }
});

// AI Question Explanation
app.post('/api/ai/explain-question', async (req, res) => {
  try {
    const { questionText, options, selectedOptionId, correctOptionId } = req.body;

    if (!questionText || !correctOptionId) {
      res.status(400).json({ error: 'Question text and correct option are required.' });
      return;
    }

    const optionsText = Array.isArray(options)
      ? options.map((o: any) => `${o.id}: ${o.text}`).join('\n')
      : '';

    const prompt = `Explain the following multiple-choice question concisely and constructively for a student.

Question: "${questionText}"
Options:
${optionsText}

Correct Answer: Option ${correctOptionId}
${selectedOptionId ? `The student answered: Option ${selectedOptionId}` : ''}

In 2 to 4 sentences:
1. Explain clearly why Option ${correctOptionId} is the correct answer.
2. ${selectedOptionId && selectedOptionId !== correctOptionId ? `Address why Option ${selectedOptionId} was incorrect and clarify the distinction.` : 'Mention a key takeaway to help remember this concept.'}
Keep the explanation friendly, accessible, and direct. Avoid markdown headings or excessive bullet points.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        systemInstruction: 'You are an encouraging, articulate, and knowledgeable AI academic tutor.',
      },
    });

    res.json({
      explanation: response.text?.trim() || 'No explanation available.',
    });
  } catch (err: any) {
    console.error('AI explain question error:', err);
    res.status(503).json({
      error: formatAiErrorMessage(err),
    });
  }
});

// Dynamic OpenGraph / Social preview route for /exam/:id
app.get('/exam/:id', async (req, res, next) => {
  const { id } = req.params;
  const exams = readExams();
  const exam = exams.find(e => e.id.toLowerCase() === id.toLowerCase());

  // If user-agent is a bot/crawler or we want to provide pre-populated OG tags
  const userAgent = req.headers['user-agent'] || '';
  const isBot = /facebookexternalhit|Facebot|Twitterbot|TelegramBot|WhatsApp|LinkedInBot|Slackbot/i.test(userAgent);

  if (isBot && exam) {
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${exam.title} — QuickTest</title>
    <meta name="description" content="${exam.description || 'Test your knowledge with this quick online quiz.'}" />
    <meta property="og:title" content="${exam.title}" />
    <meta property="og:description" content="${exam.description || 'Test your knowledge with this quick online quiz.'}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${req.protocol}://${req.get('host')}/exam/${exam.id}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${exam.title}" />
    <meta name="twitter:description" content="${exam.description || 'Test your knowledge with this quick online quiz.'}" />
  </head>
  <body>
    <h1>${exam.title}</h1>
    <p>${exam.description}</p>
    <p>Open this link to take the quiz.</p>
  </body>
</html>`;
    res.send(html);
    return;
  }

  next();
});

// Vite / static server configuration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`QuickTest server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
