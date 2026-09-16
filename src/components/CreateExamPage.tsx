import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  Copy,
  HelpCircle,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createExam, fetchExam, updateExam } from '../lib/api';
import { ActivePage, Exam, Question } from '../types';
import { AIGenerateModal } from './AIGenerateModal';
import { BulkUploadModal } from './BulkUploadModal';

interface CreateExamPageProps {
  editExamId?: string;
  onNavigate: (page: ActivePage) => void;
}

const DEFAULT_OPTIONS = [
  { id: 'A', text: '' },
  { id: 'B', text: '' },
  { id: 'C', text: '' },
  { id: 'D', text: '' },
];

function createBlankQuestion(index: number): Question {
  return {
    id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    questionText: '',
    options: [
      { id: 'A', text: '' },
      { id: 'B', text: '' },
      { id: 'C', text: '' },
      { id: 'D', text: '' },
    ],
    correctOptionId: '',
  };
}

export function CreateExamPage({ editExamId, onNavigate }: CreateExamPageProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Settings
  const [timeLimitType, setTimeLimitType] = useState<'off' | '1' | '5' | '10' | '15' | '20' | '30' | '45' | '60' | 'custom'>('off');
  const [customTimeMinutes, setCustomTimeMinutes] = useState<number>(20);
  const [passingScorePercent, setPassingScorePercent] = useState<number>(70);
  const [showAnswerImmediately, setShowAnswerImmediately] = useState<boolean>(true);
  const [randomizeQuestions, setRandomizeQuestions] = useState<boolean>(false);
  const [randomizeAnswers, setRandomizeAnswers] = useState<boolean>(false);
  const [allowRetake, setAllowRetake] = useState<boolean>(true);
  const [requireParticipantName, setRequireParticipantName] = useState<boolean>(true);

  // Questions
  const [questions, setQuestions] = useState<Question[]>([
    createBlankQuestion(1),
  ]);

  // Validation & Submission State
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingExam, setIsLoadingExam] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const handleApplyBulkQuestions = (newQuestions: Question[], mode: 'append' | 'replace') => {
    if (mode === 'replace') {
      setQuestions(newQuestions);
    } else {
      // If the current only question is blank, replace it; otherwise append
      if (questions.length === 1 && !questions[0].questionText.trim()) {
        setQuestions(newQuestions);
      } else {
        setQuestions((prev) => [...prev, ...newQuestions]);
      }
    }
    setValidationError(null);
  };

  const handleApplyAiQuestions = (
    newQuestions: Question[],
    mode: 'append' | 'replace',
    suggestedTitle?: string,
    suggestedDescription?: string
  ) => {
    if (mode === 'replace') {
      setQuestions(newQuestions);
      if (suggestedTitle && !title.trim()) {
        setTitle(suggestedTitle);
      }
      if (suggestedDescription && !description.trim()) {
        setDescription(suggestedDescription);
      }
    } else {
      // If the current only question is blank, replace it; otherwise append
      if (questions.length === 1 && !questions[0].questionText.trim()) {
        setQuestions(newQuestions);
      } else {
        setQuestions((prev) => [...prev, ...newQuestions]);
      }
      if (suggestedTitle && !title.trim()) {
        setTitle(suggestedTitle);
      }
    }
    setValidationError(null);
  };

  // Load existing exam if editing
  useEffect(() => {
    if (editExamId) {
      setIsLoadingExam(true);
      fetchExam(editExamId)
        .then((exam) => {
          setTitle(exam.title);
          setDescription(exam.description || '');
          if (exam.settings) {
            const minutes = exam.settings.timeLimitMinutes || 0;
            if (minutes === 0) setTimeLimitType('off');
            else if ([1, 5, 10, 15, 20, 30, 45, 60].includes(minutes)) setTimeLimitType(String(minutes) as any);
            else {
              setTimeLimitType('custom');
              setCustomTimeMinutes(minutes);
            }
            setPassingScorePercent(exam.settings.passingScorePercent || 70);
            setShowAnswerImmediately(exam.settings.showAnswerImmediately !== false);
            setRandomizeQuestions(Boolean(exam.settings.randomizeQuestions));
            setRandomizeAnswers(Boolean(exam.settings.randomizeAnswers));
            setAllowRetake(exam.settings.allowRetake !== false);
            setRequireParticipantName(exam.settings.requireParticipantName !== false);
          }
          if (exam.questions && exam.questions.length > 0) {
            setQuestions(exam.questions);
          }
        })
        .catch((err) => {
          setValidationError(err.message || 'Failed to load exam for editing.');
        })
        .finally(() => {
          setIsLoadingExam(false);
        });
    }
  }, [editExamId]);

  // Question manipulation
  const handleAddQuestion = () => {
    setQuestions((prev) => [...prev, createBlankQuestion(prev.length + 1)]);
    setValidationError(null);
  };

  const handleDuplicateQuestion = (index: number) => {
    const qToCopy = questions[index];
    const newQuestion: Question = {
      ...qToCopy,
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      options: qToCopy.options.map((opt) => ({ ...opt })),
    };
    const updated = [...questions];
    updated.splice(index + 1, 0, newQuestion);
    setQuestions(updated);
  };

  const handleDeleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      setValidationError('An exam must have at least one question.');
      return;
    }
    const updated = questions.filter((_, idx) => idx !== index);
    setQuestions(updated);
    setValidationError(null);
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setQuestions(updated);
  };

  const handleQuestionTextChange = (index: number, text: string) => {
    const updated = [...questions];
    updated[index].questionText = text;
    setQuestions(updated);
    if (validationError) setValidationError(null);
  };

  const handleOptionTextChange = (qIndex: number, optIndex: number, text: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex].text = text;
    setQuestions(updated);
    if (validationError) setValidationError(null);
  };

  const handleSelectCorrectOption = (qIndex: number, optionId: string) => {
    const updated = [...questions];
    updated[qIndex].correctOptionId = optionId;
    setQuestions(updated);
    if (validationError) setValidationError(null);
  };

  // Validation function
  const validateExam = (): boolean => {
    if (!title.trim()) {
      setValidationError('⚠ Exam title cannot be empty.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }

    if (questions.length === 0) {
      setValidationError('⚠ Please add at least one question to the exam.');
      return false;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qNum = i + 1;

      if (!q.questionText.trim()) {
        setValidationError(`⚠ Question ${qNum} text cannot be empty.`);
        const el = document.getElementById(`question-card-${i}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
      }

      for (let j = 0; j < q.options.length; j++) {
        const opt = q.options[j];
        const optLabel = opt.id || ['A', 'B', 'C', 'D'][j];
        if (!opt.text.trim()) {
          setValidationError(`⚠ Option ${optLabel} for Question ${qNum} cannot be empty.`);
          const el = document.getElementById(`question-card-${i}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return false;
        }
      }

      if (!q.correctOptionId) {
        setValidationError(`⚠ Please select the correct answer for Question ${qNum}.`);
        const el = document.getElementById(`question-card-${i}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
      }
    }

    setValidationError(null);
    return true;
  };

  // Publish / Save
  const handlePublish = async () => {
    if (!validateExam()) return;

    setIsSubmitting(true);
    setValidationError(null);

    let finalTimeLimit = 0;
    if (timeLimitType === 'custom') {
      finalTimeLimit = Math.max(1, Number(customTimeMinutes) || 0);
    } else if (timeLimitType !== 'off') {
      finalTimeLimit = Number(timeLimitType);
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      settings: {
        timeLimitMinutes: finalTimeLimit,
        passingScorePercent: Number(passingScorePercent) || 70,
        showAnswerImmediately,
        randomizeQuestions,
        randomizeAnswers,
        allowRetake,
        requireParticipantName,
        showFinalScore: true,
        showAnswerReview: true,
      },
      questions,
    };

    try {
      let savedExam: Exam;
      if (editExamId) {
        savedExam = await updateExam(editExamId, payload);
      } else {
        savedExam = await createExam(payload);
      }
      // Navigate to share page with the unique exam link
      onNavigate({ type: 'share', examId: savedExam.id });
    } catch (err: any) {
      setValidationError(err.message || 'Failed to save exam. Please check all fields.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingExam) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-slate-500">
        Loading exam details...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {editExamId ? 'Edit Exam' : 'Create New Exam'}
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Draft questions, assign correct answers, and customize settings.
        </p>
      </div>

      {/* Validation Alert */}
      {validationError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-sm animate-in fade-in duration-200"
          id="create-validation-alert"
        >
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm font-semibold">{validationError}</div>
        </div>
      )}

      {/* Section 1: Basic Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span>1. Exam Details</span>
        </h2>

        <div>
          <label htmlFor="exam-title" className="block text-sm font-semibold text-slate-800 mb-1.5">
            Exam Title <span className="text-red-500">*</span>
          </label>
          <input
            id="exam-title"
            type="text"
            placeholder="e.g., Computer Basic Knowledge Test"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 text-base rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="exam-desc" className="block text-sm font-semibold text-slate-800 mb-1.5">
            Exam Description <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <textarea
            id="exam-desc"
            rows={2}
            placeholder="e.g., Test your basic computer knowledge with this quick multiple-choice quiz."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2.5 text-base rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Section 2: Exam Settings (Collapsible / Clean) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-blue-600" />
            <span>2. Exam Settings</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">Optional Customization</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
          {/* Timer Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              Exam Time Limit
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(['off', '1', '5', '10', '15', '20', '30', '45', '60', 'custom'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTimeLimitType(t)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    timeLimitType === t
                      ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {t === 'off' ? 'No Limit' : t === 'custom' ? 'Custom' : t === '1' ? '1m (Speed)' : `${t}m`}
                </button>
              ))}
            </div>
            {timeLimitType === 'custom' && (
              <div className="mt-2.5 flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={customTimeMinutes}
                  onChange={(e) => setCustomTimeMinutes(Number(e.target.value))}
                  className="w-24 px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-600">minutes</span>
              </div>
            )}
            {timeLimitType !== 'off' && (
              <p className="mt-1.5 text-[11px] text-slate-500">
                ⏱️ Exam will display a live countdown timer and automatically submit answers when time expires.
              </p>
            )}
          </div>

          {/* Passing Score */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
              Passing Score: <span className="text-blue-600 font-bold">{passingScorePercent}%</span>
            </label>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={passingScorePercent}
              onChange={(e) => setPassingScorePercent(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>10%</span>
              <span>50%</span>
              <span>70% (Standard)</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
            <div>
              <div className="text-sm font-semibold text-slate-800">Show Correct Answer Immediately</div>
              <div className="text-xs text-slate-500">Shows green/red feedback right after participant picks an option</div>
            </div>
            <input
              type="checkbox"
              checked={showAnswerImmediately}
              onChange={(e) => setShowAnswerImmediately(e.target.checked)}
              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
            <div>
              <div className="text-sm font-semibold text-slate-800">Randomize Questions</div>
              <div className="text-xs text-slate-500">Shuffles questions in a different order for each participant</div>
            </div>
            <input
              type="checkbox"
              checked={randomizeQuestions}
              onChange={(e) => setRandomizeQuestions(e.target.checked)}
              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
            <div>
              <div className="text-sm font-semibold text-slate-800">Randomize Answer Options</div>
              <div className="text-xs text-slate-500">Shuffles choices (A, B, C, D) while preserving the correct answer</div>
            </div>
            <input
              type="checkbox"
              checked={randomizeAnswers}
              onChange={(e) => setRandomizeAnswers(e.target.checked)}
              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
            <div>
              <div className="text-sm font-semibold text-slate-800">Ask Participant Name</div>
              <div className="text-xs text-slate-500">Prompts participant to type their name before beginning the test</div>
            </div>
            <input
              type="checkbox"
              checked={requireParticipantName}
              onChange={(e) => setRequireParticipantName(e.target.checked)}
              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
            <div>
              <div className="text-sm font-semibold text-slate-800">Allow Retakes</div>
              <div className="text-xs text-slate-500">Allows participants to retake the test from the results screen</div>
            </div>
            <input
              type="checkbox"
              checked={allowRetake}
              onChange={(e) => setAllowRetake(e.target.checked)}
              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      {/* Section 3: Questions List */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>3. Questions ({questions.length})</span>
            </h2>
            <span className="text-xs text-slate-500">
              Select the radio button on the correct answer for each question
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              id="create-btn-bulk-upload"
              title="Upload questions from CSV, Excel, or formatted text"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Bulk Upload (CSV)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              id="create-btn-ai-generate"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate with AI</span>
            </button>
          </div>
        </div>

        {questions.map((q, qIdx) => (
          <div
            key={q.id}
            id={`question-card-${qIdx}`}
            className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4 relative"
          >
            {/* Question Header & Action Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-sm uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                Question {qIdx + 1}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveQuestion(qIdx, 'up')}
                  disabled={qIdx === 0}
                  className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-100"
                  title="Move Up"
                  aria-label={`Move Question ${qIdx + 1} Up`}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveQuestion(qIdx, 'down')}
                  disabled={qIdx === questions.length - 1}
                  className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-100"
                  title="Move Down"
                  aria-label={`Move Question ${qIdx + 1} Down`}
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDuplicateQuestion(qIdx)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                  title="Duplicate Question"
                  aria-label={`Duplicate Question ${qIdx + 1}`}
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteQuestion(qIdx)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                  title="Delete Question"
                  aria-label={`Delete Question ${qIdx + 1}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Question Text */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Question Text <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder={`e.g., Who is the father of computer?`}
                value={q.questionText}
                onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                className="w-full px-3.5 py-2.5 text-base rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
              />
            </div>

            {/* Options */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <span>Answer Options</span>
                <span>Select 1 Correct Answer</span>
              </div>

              {q.options.map((opt, optIdx) => {
                const optLetter = opt.id || ['A', 'B', 'C', 'D'][optIdx];
                const isSelected = q.correctOptionId === optLetter;

                return (
                  <div
                    key={optLetter}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border transition-colors ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-slate-200 bg-slate-50/60 focus-within:border-blue-400'
                    }`}
                  >
                    {/* Option Label */}
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-slate-700 border border-slate-300'
                      }`}
                    >
                      {optLetter}
                    </div>

                    {/* Text Input */}
                    <input
                      type="text"
                      placeholder={`Option ${optLetter} text`}
                      value={opt.text}
                      onChange={(e) => handleOptionTextChange(qIdx, optIdx, e.target.value)}
                      className="flex-1 bg-white px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    {/* Radio Button for Correct Answer */}
                    <label className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-md hover:bg-white/80">
                      <input
                        type="radio"
                        name={`correct_q_${qIdx}`}
                        checked={isSelected}
                        onChange={() => handleSelectCorrectOption(qIdx, optLetter)}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span
                        className={`text-xs font-medium ${
                          isSelected ? 'text-emerald-700 font-bold' : 'text-slate-500'
                        }`}
                      >
                        {isSelected ? 'Correct ✓' : 'Correct'}
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Add Question Button & AI Generator Button */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleAddQuestion}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 border border-blue-200 rounded-xl transition-colors shadow-sm cursor-pointer"
            id="create-btn-add-question"
          >
            <Plus className="w-4 h-4" />
            Add Blank Question
          </button>

          <button
            type="button"
            onClick={() => setIsBulkModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-xs transition-all cursor-pointer"
            id="create-btn-bulk-upload-bottom"
          >
            <UploadCloud className="w-4 h-4 text-slate-600" />
            Bulk Upload (CSV)
          </button>

          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            id="create-btn-ai-generate-bottom"
          >
            <Sparkles className="w-4 h-4" />
            Generate with AI
          </button>
        </div>
      </div>

      {/* Large Publish Button Bar */}
      <div className="sticky bottom-4 z-30 pt-4">
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            {questions.length} questions • Validated on publish
          </div>

          <button
            type="button"
            onClick={handlePublish}
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 rounded-xl shadow-lg shadow-blue-500/30 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
            id="create-btn-publish"
          >
            <CheckCircle2 className="w-5 h-5" />
            {isSubmitting ? 'Publishing...' : editExamId ? 'UPDATE EXAM' : 'PUBLISH EXAM'}
          </button>
        </div>
      </div>

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onApplyQuestions={handleApplyBulkQuestions}
        existingQuestionsCount={questions.length}
      />

      {/* AI Question Generator Modal */}
      <AIGenerateModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApplyQuestions={handleApplyAiQuestions}
      />
    </div>
  );
}
