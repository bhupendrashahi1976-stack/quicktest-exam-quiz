import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Award,
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  HelpCircle,
  Loader2,
  PartyPopper,
  RotateCcw,
  Share2,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { explainQuestionWithAI } from '../lib/api';
import { celebrationAudio } from '../lib/audioUtils';
import { exportSingleScorecardCsv } from '../lib/exportUtils';
import { ActivePage, Exam, ExamAttempt, Question } from '../types';

interface ResultPageProps {
  attempt: ExamAttempt;
  exam: Exam;
  onNavigate: (page: ActivePage) => void;
}

export function ResultPage({ attempt, exam, onNavigate }: ResultPageProps) {
  const [showReview, setShowReview] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [loadingAi, setLoadingAi] = useState<Record<string, boolean>>({});
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});

  const handleRequestAiExplanation = async (q: Question, selectedOptId: string) => {
    if (loadingAi[q.id]) return;
    setLoadingAi((prev) => ({ ...prev, [q.id]: true }));
    setAiErrors((prev) => ({ ...prev, [q.id]: '' }));
    try {
      const text = await explainQuestionWithAI({
        questionText: q.questionText,
        options: q.options,
        selectedOptionId: selectedOptId,
        correctOptionId: q.correctOptionId,
      });
      setAiExplanations((prev) => ({ ...prev, [q.id]: text }));
    } catch (err: any) {
      setAiErrors((prev) => ({
        ...prev,
        [q.id]: err.message || 'Failed to generate explanation.',
      }));
    } finally {
      setLoadingAi((prev) => ({ ...prev, [q.id]: false }));
    }
  };

  const triggerCelebration = () => {
    try {
      // Dual-cannon celebration confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2563eb', '#38bdf8', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
      });
      celebrationAudio.playVictoryChime();
    } catch (e) {
      // Fallback gracefully
    }
  };

  useEffect(() => {
    // Fire celebratory confetti and audio if user passed or scored >= 70%
    if (attempt.passed || attempt.scorePercent >= 70) {
      triggerCelebration();
    }
  }, [attempt.passed, attempt.scorePercent]);

  const examUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/exam/${exam.id}`
    : `https://quicktest.app/exam/${exam.id}`;

  const shareText = `I scored ${attempt.scorePercent}% (${attempt.correctAnswers}/${attempt.totalQuestions}) on "${exam.title}"! 🧠\nCan you beat my score? Take the test: ${examUrl}`;

  const handleShareResult = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Result: ${exam.title}`,
          text: shareText,
          url: examUrl,
        });
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const formattedTimeTaken = () => {
    const totalSecs = attempt.timeTakenSeconds || 0;
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Top Banner Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm text-center space-y-6">
        <div className="space-y-2">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-sm ${
              attempt.passed
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-blue-100 text-blue-600'
            }`}
          >
            {attempt.passed ? (
              <Award className="w-9 h-9" />
            ) : (
              <Sparkles className="w-9 h-9" />
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            🎉 Test Completed!
          </h1>
          <p className="text-slate-500 text-sm font-medium">{exam.title}</p>
          {attempt.participantName && attempt.participantName !== 'Anonymous Participant' && (
            <p className="text-xs font-semibold text-slate-600">
              Participant: {attempt.participantName}
            </p>
          )}
        </div>

        {/* Big Score Display */}
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/80 max-w-sm mx-auto space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Your Score
          </div>
          <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
            {attempt.correctAnswers} <span className="text-slate-400 font-normal text-3xl">/</span> {attempt.totalQuestions}
          </div>
          <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-bold text-base">
            {attempt.scorePercent}%
          </div>
        </div>

        {/* Pass / Neutral Status Notice */}
        {exam.settings.passingScorePercent > 0 && (
          <div className="max-w-md mx-auto">
            {attempt.passed ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold flex items-center justify-between gap-2">
                <span>🎉 Congratulations! You Passed!</span>
                <button
                  type="button"
                  onClick={triggerCelebration}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="Trigger celebration confetti and chime again"
                >
                  <PartyPopper className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Confetti 🎊</span>
                </button>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium">
                Your score is below the selected passing score ({exam.settings.passingScorePercent}%).
              </div>
            )}
          </div>
        )}

        {/* Summary Metric Badges */}
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-center">
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
            <span className="text-xs text-emerald-700 font-semibold block mb-0.5">
              Correct
            </span>
            <span className="text-xl font-bold text-emerald-800">
              {attempt.correctAnswers}
            </span>
          </div>

          <div className="p-3 bg-red-50/60 rounded-xl border border-red-100">
            <span className="text-xs text-red-700 font-semibold block mb-0.5">
              Wrong
            </span>
            <span className="text-xl font-bold text-red-800">
              {attempt.wrongAnswers}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-600 font-semibold block mb-0.5">
              Time
            </span>
            <span className="text-xl font-bold text-slate-800">
              {formattedTimeTaken()}
            </span>
          </div>
        </div>

        {/* Main Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {exam.settings.allowRetake && (
            <button
              onClick={() => onNavigate({ type: 'take-exam', examId: exam.id })}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
              id="result-btn-retake"
            >
              <RotateCcw className="w-4 h-4" />
              Retake Test
            </button>
          )}

          <button
            onClick={handleShareResult}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold text-sm rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
            id="result-btn-share"
          >
            {copiedShare ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                Score Copied! ✓
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Share Result
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => exportSingleScorecardCsv(exam, attempt)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 border border-emerald-300 font-semibold text-sm rounded-xl transition-colors focus:outline-none cursor-pointer"
            id="result-btn-download-csv"
            title="Download detailed scorecard as an Excel-ready CSV"
          >
            <Download className="w-4 h-4" />
            Download Scorecard (CSV)
          </button>

          <button
            onClick={() => onNavigate({ type: 'home' })}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-slate-600 hover:text-slate-900 font-semibold text-sm rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            id="result-btn-home"
          >
            Back to Home
          </button>
        </div>
      </div>

      {/* Answer Review Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Review Answers</h2>
            <p className="text-xs text-slate-500">
              Inspect your answers alongside correct choices
            </p>
          </div>

          <button
            onClick={() => setShowReview(!showReview)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
            id="result-btn-toggle-review"
          >
            {showReview ? 'Hide Review' : 'Review Answers'}
          </button>
        </div>

        {showReview && (
          <div className="space-y-4 pt-4 border-t border-slate-100 animate-in fade-in duration-200">
            {exam.questions.map((q, idx) => {
              const attemptAns = attempt.answers.find((a) => a.questionId === q.id);
              const selectedOptId = attemptAns?.selectedOptionId || '';
              const isCorrect = attemptAns?.isCorrect;
              const selectedOptText =
                q.options.find((o) => (o.id || '') === selectedOptId)?.text || 'None';
              const correctOptText =
                q.options.find((o) => (o.id || '') === q.correctOptionId)?.text || '';

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-xl border ${
                    isCorrect
                      ? 'border-emerald-200 bg-emerald-50/30'
                      : 'border-red-200 bg-red-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {idx + 1}. {q.questionText}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" /> Incorrect
                        </>
                      )}
                    </span>
                  </div>

                  <div className="text-xs sm:text-sm space-y-1">
                    <div className="text-slate-700">
                      <span className="font-semibold text-slate-500">Your answer:</span>{' '}
                      <span className={isCorrect ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                        {selectedOptId ? `(${selectedOptId}) ${selectedOptText}` : 'Not answered'}
                      </span>
                    </div>

                    {!isCorrect && (
                      <div className="text-slate-700">
                        <span className="font-semibold text-slate-500">Correct answer:</span>{' '}
                        <span className="text-emerald-700 font-bold">
                          ({q.correctOptionId}) {correctOptText}
                        </span>
                      </div>
                    )}

                    {/* AI Explanation in Review */}
                    {aiExplanations[q.id] ? (
                      <div className="mt-2.5 p-3 rounded-lg bg-white border border-blue-200 text-xs text-slate-700 space-y-1">
                        <div className="flex items-center gap-1 font-bold text-blue-700">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          <span>AI Tutor Explanation</span>
                        </div>
                        <p className="leading-relaxed">{aiExplanations[q.id]}</p>
                      </div>
                    ) : (
                      <div className="pt-1 space-y-1.5">
                        <button
                          type="button"
                          onClick={() => handleRequestAiExplanation(q, selectedOptId)}
                          disabled={loadingAi[q.id]}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-md transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          {loadingAi[q.id] ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                              <span>Explaining...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 text-blue-600" />
                              <span>{aiErrors[q.id] ? 'Retry AI Explanation' : 'Explain with AI'}</span>
                            </>
                          )}
                        </button>
                        {aiErrors[q.id] && (
                          <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-md border border-amber-200 leading-snug">
                            {aiErrors[q.id]}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
