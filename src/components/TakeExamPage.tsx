import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  User,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { checkAnswer, explainQuestionWithAI, fetchExam, submitExam } from '../lib/api';
import { ActivePage, Exam, ExamAttempt, Question, QuestionOption } from '../types';

interface TakeExamPageProps {
  examId: string;
  onNavigate: (page: ActivePage) => void;
}

interface QuestionFeedback {
  selectedOptionId: string;
  isCorrect: boolean;
  correctOptionId: string;
}

// Utility to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function TakeExamPage({ examId, onNavigate }: TakeExamPageProps) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Participant Setup State
  const [hasStarted, setHasStarted] = useState(false);
  const [participantName, setParticipantName] = useState('');

  // Exam Progress State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [questionFeedback, setQuestionFeedback] = useState<Record<string, QuestionFeedback>>({});
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [isFinishingExam, setIsFinishingExam] = useState(false);

  // Timer State
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [timeTakenSeconds, setTimeTakenSeconds] = useState(0);
  const [isTimerVisible, setIsTimerVisible] = useState(true);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // AI Explanation State
  const [aiExplaining, setAiExplaining] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Load exam
  useEffect(() => {
    fetchExam(examId)
      .then((data) => {
        setExam(data);
        // If participant name is NOT required, we can still start or prompt
      })
      .catch((err) => {
        setError(err.message || 'Sorry, this exam could not be found.');
      })
      .finally(() => setIsLoading(false));
  }, [examId]);

  // Questions and options with optional randomization
  const activeQuestions: Question[] = useMemo(() => {
    if (!exam || !exam.questions) return [];
    let list = [...exam.questions];
    if (exam.settings?.randomizeQuestions) {
      list = shuffleArray(list);
    }
    if (exam.settings?.randomizeAnswers) {
      list = list.map((q) => ({
        ...q,
        options: shuffleArray(q.options),
      }));
    }
    return list;
  }, [exam]);

  // Handle Start Exam
  const handleStartExam = () => {
    setHasStarted(true);
    if (exam?.settings?.timeLimitMinutes && exam.settings.timeLimitMinutes > 0) {
      setSecondsRemaining(exam.settings.timeLimitMinutes * 60);
    }
  };

  // Timer countdown hook
  useEffect(() => {
    if (!hasStarted) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeTakenSeconds((prev) => prev + 1);

      setSecondsRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          // Time expired! Auto-submit
          clearInterval(timerIntervalRef.current!);
          handleAutoSubmitTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [hasStarted]);

  // Auto-submit when timer expires
  const handleAutoSubmitTimeExpired = async () => {
    if (!exam) return;
    setIsFinishingExam(true);
    try {
      const res = await submitExam(
        exam.id,
        participantName || 'Anonymous Participant',
        selectedAnswers,
        timeTakenSeconds
      );
      onNavigate({ type: 'result', attempt: res.attempt, exam: res.exam });
    } catch (err) {
      console.error('Error auto-submitting:', err);
    }
  };

  // Format MM:SS for timer
  const formattedTimer = useMemo(() => {
    if (secondsRemaining === null) return null;
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [secondsRemaining]);

  const currentQ = activeQuestions[currentQuestionIndex];
  const currentFeedback = currentQ ? questionFeedback[currentQ.id] : undefined;
  const isAnswered = Boolean(currentFeedback);

  // Answer selection handler
  const handleSelectOption = async (optionId: string) => {
    if (!exam || !currentQ || isAnswered || isSubmittingAnswer) return;

    setIsSubmittingAnswer(true);

    try {
      const checkRes = await checkAnswer(exam.id, currentQ.id, optionId);

      setSelectedAnswers((prev) => ({
        ...prev,
        [currentQ.id]: optionId,
      }));

      setQuestionFeedback((prev) => ({
        ...prev,
        [currentQ.id]: {
          selectedOptionId: optionId,
          isCorrect: checkRes.isCorrect,
          correctOptionId: checkRes.correctOptionId,
        },
      }));
    } catch (err) {
      console.error('Check answer error:', err);
      // Fallback local check
      const isCorrect = currentQ.correctOptionId === optionId;
      setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: optionId }));
      setQuestionFeedback((prev) => ({
        ...prev,
        [currentQ.id]: {
          selectedOptionId: optionId,
          isCorrect,
          correctOptionId: currentQ.correctOptionId,
        },
      }));
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  // AI Explanation Handler
  const handleExplainWithAI = async () => {
    if (!currentQ || !currentFeedback || aiExplaining) return;
    setAiExplaining(true);
    setAiError(null);
    try {
      const text = await explainQuestionWithAI({
        questionText: currentQ.questionText,
        options: currentQ.options,
        selectedOptionId: currentFeedback.selectedOptionId,
        correctOptionId: currentFeedback.correctOptionId,
      });
      setAiExplanation(text);
    } catch (err: any) {
      setAiError(err.message || 'Failed to get AI explanation.');
    } finally {
      setAiExplaining(false);
    }
  };

  // Next question or finish
  const handleNextQuestion = async () => {
    if (!exam) return;
    setAiExplanation(null);
    setAiError(null);
    if (currentQuestionIndex < activeQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Last question completed: submit to backend
      setIsFinishingExam(true);
      try {
        const res = await submitExam(
          exam.id,
          participantName || 'Anonymous Participant',
          selectedAnswers,
          timeTakenSeconds
        );
        onNavigate({ type: 'result', attempt: res.attempt, exam: res.exam });
      } catch (err: any) {
        alert(err.message || 'Failed to submit test results.');
        setIsFinishingExam(false);
      }
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-600 font-medium">Loading exam questions...</p>
      </div>
    );
  }

  // Error State
  if (error || !exam) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          {error || 'Sorry, this exam could not be found.'}
        </h2>
        <p className="text-slate-600 text-sm">
          The link may be mistyped or the exam might have been deleted by its creator.
        </p>
        <button
          onClick={() => onNavigate({ type: 'home' })}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm shadow-sm hover:bg-blue-700"
        >
          Go Home
        </button>
      </div>
    );
  }

  // Screen 1: Participant Name Entry / Start Screen (if not started yet)
  if (!hasStarted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7" />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {exam.title}
            </h1>
            {exam.description && (
              <p className="mt-2 text-slate-600 text-sm sm:text-base leading-relaxed">
                {exam.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-3 border-y border-slate-100 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50">
              <span className="text-slate-400 block mb-0.5">Questions</span>
              <span className="font-bold text-slate-800 text-sm">{exam.questions.length}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50">
              <span className="text-slate-400 block mb-0.5">Time Limit</span>
              <span className="font-bold text-slate-800 text-sm">
                {exam.settings.timeLimitMinutes > 0
                  ? `${exam.settings.timeLimitMinutes} mins`
                  : 'Untimed'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 col-span-2 sm:col-span-1">
              <span className="text-slate-400 block mb-0.5">Passing Score</span>
              <span className="font-bold text-slate-800 text-sm">
                {exam.settings.passingScorePercent}%
              </span>
            </div>
          </div>

          {exam.settings.requireParticipantName && (
            <div className="text-left space-y-1.5">
              <label htmlFor="participant-name" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Enter your name <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="participant-name"
                  type="text"
                  placeholder="e.g., Alex Johnson"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleStartExam}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-base rounded-xl shadow-lg shadow-blue-500/25 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
            id="exam-start-btn"
          >
            <Play className="w-5 h-5 fill-white" />
            Start Test
          </button>
        </div>
      </div>
    );
  }

  // Active Exam Taking Screen
  const totalQCount = activeQuestions.length;
  const currentQNum = currentQuestionIndex + 1;
  const progressPercent = Math.round((currentQNum / totalQCount) * 100);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 space-y-6">
      {/* Top Bar: Exam Title, Question Count, & Optional Timer */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block">
              {exam.title}
            </span>
            <div className="text-sm font-semibold text-slate-800">
              Question {currentQNum} of {totalQCount}
            </div>
          </div>

          {/* Optional Timer & Hide/Show Distraction Toggle */}
          {formattedTimer && (
            <div className="flex items-center gap-1.5">
              {isTimerVisible ? (
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-tight shadow-sm transition-all ${
                    (secondsRemaining || 0) < 60
                      ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse'
                      : 'bg-slate-100 text-slate-800 border border-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Time: {formattedTimer}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px]">Timer Hidden</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsTimerVisible((prev) => !prev)}
                id="exam-toggle-timer"
                aria-label={isTimerVisible ? 'Hide countdown timer' : 'Show countdown timer'}
                title={isTimerVisible ? 'Hide timer if distracting' : 'Show countdown timer'}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
              >
                {isTimerVisible ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline text-xs">Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-xs">Show</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Progress Bar (Question 4 of 10 - 40%) */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500 font-medium">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-6">
        {/* Question Prompt */}
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Question {currentQNum}
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
            {currentQ.questionText}
          </h2>
        </div>

        {/* Answer Options */}
        <div className="space-y-3" role="radiogroup" aria-label="Answer options">
          {currentQ.options.map((opt, optIdx) => {
            const letter = opt.id || ['A', 'B', 'C', 'D'][optIdx];
            const isSelected = currentFeedback?.selectedOptionId === letter;
            const isThisCorrect = currentFeedback?.correctOptionId === letter;
            const showAnswers = exam.settings.showAnswerImmediately;

            // Determine option styling based on answered state and correctness
            let cardStyle =
              'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30 text-slate-800';
            let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300';
            let statusIcon = null;

            if (isAnswered) {
              if (isSelected) {
                if (currentFeedback.isCorrect) {
                  // User picked correct!
                  cardStyle =
                    'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 shadow-sm';
                  badgeStyle = 'bg-emerald-600 text-white border-emerald-600';
                  statusIcon = <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 animate-in zoom-in-50 duration-200" />;
                } else {
                  // User picked wrong!
                  cardStyle =
                    'border-red-500 bg-red-50 text-red-950 ring-2 ring-red-500/20 shadow-sm animate-shake';
                  badgeStyle = 'bg-red-600 text-white border-red-600';
                  statusIcon = <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 animate-in zoom-in-50 duration-200" />;
                }
              } else if (showAnswers && isThisCorrect) {
                // Highlight the correct answer if participant chose wrong
                cardStyle =
                  'border-emerald-400 bg-emerald-50/60 text-emerald-900 border-dashed';
                badgeStyle = 'bg-emerald-600 text-white border-emerald-600';
                statusIcon = (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex-shrink-0">
                    Correct answer
                  </span>
                );
              } else {
                cardStyle = 'border-slate-200 bg-slate-50/50 text-slate-400 opacity-60';
                badgeStyle = 'bg-slate-100 text-slate-400 border-slate-200';
              }
            }

            return (
              <button
                key={letter}
                type="button"
                onClick={() => handleSelectOption(letter)}
                disabled={isAnswered || isSubmittingAnswer}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-3 text-sm sm:text-base font-medium select-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-default ${cardStyle}`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${badgeStyle}`}
                  >
                    {letter}
                  </div>
                  <span className="truncate-2-lines">{opt.text}</span>
                </div>

                {statusIcon}
              </button>
            );
          })}
        </div>

        {/* Instant Visual Answer Feedback Banner */}
        {isAnswered && exam.settings.showAnswerImmediately && (
          <div
            className={`p-4 rounded-xl border transition-all animate-in fade-in duration-200 space-y-3 ${
              currentFeedback.isCorrect
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                {currentFeedback.isCorrect ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <div className="font-bold text-sm sm:text-base">
                      ✅ Correct Answer!
                    </div>
                  </>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <span className="font-bold text-sm sm:text-base">
                        ❌ Wrong Answer
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-700 font-medium pl-7">
                      Correct answer:{' '}
                      <span className="font-bold text-emerald-700">
                        Option {currentFeedback.correctOptionId}
                      </span>{' '}
                      —{' '}
                      {
                        currentQ.options.find(
                          (o) => (o.id || '') === currentFeedback.correctOptionId
                        )?.text
                      }
                    </div>
                  </div>
                )}
              </div>

              {/* AI Explain Button */}
              {!aiExplanation && (
                <button
                  type="button"
                  onClick={handleExplainWithAI}
                  disabled={aiExplaining}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-white text-blue-700 hover:text-blue-800 text-xs font-bold rounded-lg border border-blue-200 shadow-sm transition-all cursor-pointer"
                  id="take-exam-ai-explain-btn"
                >
                  {aiExplaining ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span>Explaining...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Explain with AI</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* AI Explanation Box */}
            {aiExplanation && (
              <div className="mt-2 p-3.5 rounded-xl bg-white/95 border border-blue-200/80 shadow-sm text-slate-800 space-y-1.5 animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>AI Tutor Explanation</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                  {aiExplanation}
                </p>
              </div>
            )}

            {aiError && (
              <div className="text-xs text-red-600 bg-white/80 p-2 rounded-lg border border-red-200">
                {aiError}
              </div>
            )}
          </div>
        )}

        {/* Next Question / Finish Exam Button (gives participant time to read feedback!) */}
        {isAnswered && (
          <div className="pt-2 flex justify-end animate-in fade-in duration-200">
            <button
              onClick={handleNextQuestion}
              disabled={isFinishingExam}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm sm:text-base rounded-xl shadow-md shadow-blue-500/25 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              id="exam-next-btn"
            >
              {isFinishingExam ? (
                'Submitting Results...'
              ) : currentQuestionIndex < totalQCount - 1 ? (
                <>
                  Next Question
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                'Finish Exam & View Results 🎉'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
