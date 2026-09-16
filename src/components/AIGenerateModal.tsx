import {
  Check,
  HelpCircle,
  Lightbulb,
  Loader2,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { generateQuestionsWithAI } from '../lib/api';
import { Question } from '../types';

interface AIGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyQuestions: (
    questions: Question[],
    mode: 'append' | 'replace',
    suggestedTitle?: string,
    suggestedDescription?: string
  ) => void;
}

const SAMPLE_TOPICS = [
  'General Science & Physics',
  'World History & Civilizations',
  'JavaScript & Web Fundamentals',
  'Cell Biology & Genetics',
  'Geography & Capitals',
  'English Grammar & Idioms',
];

export function AIGenerateModal({
  isOpen,
  onClose,
  onApplyQuestions,
}: AIGenerateModalProps) {
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [contextText, setContextText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generated preview
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[] | null>(null);
  const [suggestedTitle, setSuggestedTitle] = useState('');
  const [suggestedDescription, setSuggestedDescription] = useState('');

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic or subject for the quiz questions.');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setGeneratedQuestions(null);

    try {
      const res = await generateQuestionsWithAI({
        topic: topic.trim(),
        numQuestions,
        difficulty,
        contextText: contextText.trim() || undefined,
      });

      if (!res.questions || res.questions.length === 0) {
        throw new Error('No questions could be generated. Please try a different topic.');
      }

      setGeneratedQuestions(res.questions);
      setSuggestedTitle(res.suggestedTitle || '');
      setSuggestedDescription(res.suggestedDescription || '');
    } catch (err: any) {
      setError(err.message || 'Failed to generate quiz questions with AI.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = (mode: 'append' | 'replace') => {
    if (!generatedQuestions || generatedQuestions.length === 0) return;
    onApplyQuestions(generatedQuestions, mode, suggestedTitle, suggestedDescription);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-modal-title"
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="ai-modal-title" className="text-lg sm:text-xl font-extrabold text-slate-900">
                Generate Questions with AI
              </h2>
              <p className="text-xs text-slate-500">
                Powered by Gemini • Automatically drafts multiple-choice questions & answers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium">
              {error}
            </div>
          )}

          {!generatedQuestions ? (
            /* Input Form */
            <div className="space-y-4">
              {/* Topic Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Quiz Subject or Topic <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g., Photosynthesis and Cellular Respiration"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleGenerate();
                    }}
                    className="w-full px-4 py-2.5 text-sm sm:text-base rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isGenerating}
                  />
                </div>

                {/* Quick Topic Chips */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <Lightbulb className="w-3 h-3 text-amber-500" /> Ideas:
                  </span>
                  {SAMPLE_TOPICS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTopic(t)}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors cursor-pointer"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Questions & Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Number of Questions
                  </label>
                  <div className="flex gap-2">
                    {[3, 5, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setNumQuestions(num)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          numQuestions === num
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {num} Questions
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Difficulty Level
                  </label>
                  <div className="flex gap-2">
                    {(['Beginner', 'Intermediate', 'Advanced'] as const).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setDifficulty(diff)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          difficulty === diff
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Optional Context Text */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Source Material / Notes <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Paste textbook excerpts, lecture bullet points, or articles to generate questions specifically from your text..."
                  value={contextText}
                  onChange={(e) => setContextText(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isGenerating}
                />
              </div>
            </div>
          ) : (
            /* Preview Generated Questions */
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="font-bold text-sm text-emerald-900">
                      Generated {generatedQuestions.length} Questions!
                    </span>
                    {suggestedTitle && (
                      <div className="text-xs text-emerald-700">
                        Suggested Title: <span className="font-semibold">{suggestedTitle}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setGeneratedQuestions(null)}
                  className="text-xs text-emerald-700 hover:text-emerald-900 underline font-medium cursor-pointer"
                >
                  Edit Prompt
                </button>
              </div>

              <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                {generatedQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs"
                  >
                    <div className="font-bold text-slate-900 text-sm">
                      {idx + 1}. {q.questionText}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-1">
                      {q.options.map((opt) => {
                        const isCorrect = opt.id === q.correctOptionId;
                        return (
                          <div
                            key={opt.id}
                            className={`p-1.5 rounded-lg flex items-center gap-2 border ${
                              isCorrect
                                ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950 font-semibold'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {opt.id}
                            </span>
                            <span className="truncate">{opt.text}</span>
                            {isCorrect && (
                              <span className="ml-auto text-[10px] text-emerald-700 font-bold">
                                Correct ✓
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {!generatedQuestions ? (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              id="ai-generate-submit-btn"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Questions...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate Questions
                </>
              )}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleApply('append')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-bold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
                id="ai-apply-append-btn"
              >
                + Append to Exam
              </button>
              <button
                type="button"
                onClick={() => handleApply('replace')}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                id="ai-apply-replace-btn"
              >
                <Check className="w-4 h-4" />
                Replace & Apply All
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
