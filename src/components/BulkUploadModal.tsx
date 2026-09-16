import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Plus,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { downloadQuestionTemplateCsv } from '../lib/exportUtils';
import { Question } from '../types';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyQuestions: (questions: Question[], mode: 'append' | 'replace') => void;
  existingQuestionsCount: number;
}

interface ParsedQuestionPreview {
  id: string;
  questionText: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation?: string;
  isValid: boolean;
  validationError?: string;
}

export function BulkUploadModal({
  isOpen,
  onClose,
  onApplyQuestions,
  existingQuestionsCount,
}: BulkUploadModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pasteText, setPasteText] = useState('');
  const [parsedList, setParsedList] = useState<ParsedQuestionPreview[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Split standard CSV line considering quotes
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  /**
   * Universal parser for CSV and Text-based Q&A blocks
   */
  const parseRawContent = (content: string) => {
    setParseError(null);
    if (!content.trim()) {
      setParsedList([]);
      return;
    }

    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setParsedList([]);
      return;
    }

    // Check if the content looks like CSV (contains commas and multiple columns per line)
    const looksLikeCsv = lines.some(
      (l) => !l.startsWith('#') && (l.match(/,/g) || []).length >= 3
    );

    const questions: ParsedQuestionPreview[] = [];

    if (looksLikeCsv) {
      // Parse as CSV
      let startIndex = 0;
      // Skip header row if it contains 'question' or 'option'
      const firstLineLower = lines[0].toLowerCase();
      if (
        firstLineLower.includes('question') ||
        firstLineLower.includes('option') ||
        firstLineLower.includes('answer')
      ) {
        startIndex = 1;
      }

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        if (!line || line.startsWith('#')) continue;

        const cols = parseCsvLine(line);
        if (cols.length < 3) continue;

        const qText = cols[0];
        // Collect options (standard 4 options: cols 1, 2, 3, 4)
        const rawOptions: { id: string; text: string }[] = [];
        const optIds = ['A', 'B', 'C', 'D', 'E', 'F'];

        let correctColVal = '';
        let explanation = '';

        if (cols.length >= 6) {
          // Standard: Question, OptA, OptB, OptC, OptD, Correct, Explanation
          rawOptions.push({ id: 'A', text: cols[1] || '' });
          rawOptions.push({ id: 'B', text: cols[2] || '' });
          rawOptions.push({ id: 'C', text: cols[3] || '' });
          rawOptions.push({ id: 'D', text: cols[4] || '' });
          correctColVal = (cols[5] || '').toUpperCase().trim();
          explanation = cols[6] || '';
        } else if (cols.length === 4) {
          // 2 options: Question, OptA, OptB, Correct
          rawOptions.push({ id: 'A', text: cols[1] || '' });
          rawOptions.push({ id: 'B', text: cols[2] || '' });
          correctColVal = (cols[3] || '').toUpperCase().trim();
        } else if (cols.length === 5) {
          // 3 options: Question, OptA, OptB, OptC, Correct
          rawOptions.push({ id: 'A', text: cols[1] || '' });
          rawOptions.push({ id: 'B', text: cols[2] || '' });
          rawOptions.push({ id: 'C', text: cols[3] || '' });
          correctColVal = (cols[4] || '').toUpperCase().trim();
        }

        // Clean options - filter empty ones
        const validOptions = rawOptions.filter((o) => o.text.trim().length > 0);

        // Normalize correct answer
        let correctOptionId = correctColVal.replace(/[^A-F1-6]/g, '');
        if (['1', '2', '3', '4'].includes(correctOptionId)) {
          correctOptionId = ['A', 'B', 'C', 'D'][parseInt(correctOptionId) - 1];
        }

        const isValid =
          Boolean(qText.trim()) &&
          validOptions.length >= 2 &&
          validOptions.some((o) => o.id === correctOptionId);

        let validationError: string | undefined;
        if (!qText.trim()) validationError = 'Missing question text';
        else if (validOptions.length < 2)
          validationError = 'Requires at least 2 options';
        else if (!validOptions.some((o) => o.id === correctOptionId))
          validationError = 'Valid correct answer (A, B, C, D) required';

        questions.push({
          id: `bulk_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
          questionText: qText,
          options: validOptions,
          correctOptionId: correctOptionId || 'A',
          explanation,
          isValid,
          validationError,
        });
      }
    } else {
      // Parse as structured text (e.g., standard numbered Q&A blocks)
      let currentQ: Partial<ParsedQuestionPreview> | null = null;
      let currentOptions: { id: string; text: string }[] = [];

      const flushCurrent = () => {
        if (currentQ && currentQ.questionText) {
          const validOptions = currentOptions.filter((o) => o.text.trim().length > 0);
          let correctOptionId = (currentQ.correctOptionId || 'A').toUpperCase();

          const isValid =
            Boolean(currentQ.questionText.trim()) &&
            validOptions.length >= 2 &&
            validOptions.some((o) => o.id === correctOptionId);

          let validationError: string | undefined;
          if (!currentQ.questionText.trim()) validationError = 'Missing question text';
          else if (validOptions.length < 2)
            validationError = 'Requires at least 2 options';
          else if (!validOptions.some((o) => o.id === correctOptionId))
            validationError = `Invalid correct answer (${correctOptionId})`;

          questions.push({
            id: `bulk_${Date.now()}_${questions.length}_${Math.random().toString(36).substring(2, 5)}`,
            questionText: currentQ.questionText.trim(),
            options: validOptions,
            correctOptionId: correctOptionId || (validOptions[0]?.id ?? 'A'),
            explanation: currentQ.explanation || '',
            isValid,
            validationError,
          });
        }
        currentQ = null;
        currentOptions = [];
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Question pattern: e.g. "1. Question?" or "Q1: Question" or "Question 1:"
        const qMatch = line.match(/^(?:(?:Q(?:uestion)?\s*(\d+)[:.]?)|(?:(\d+)[.:)]))\s*(.+)$/i);
        // Option pattern: e.g. "A) Option" or "A. Option" or "[A] Option" or "(A) Option"
        const optMatch = line.match(/^[\(\[]?([A-Fa-f1-6])[\)\]\.:\-]\s*(.+)$/);
        // Answer pattern: e.g. "Answer: B" or "Correct: C" or "Ans: A"
        const ansMatch = line.match(/^(?:(?:Correct\s*Answer|Answer|Ans|Key)[:\s]+)([A-Fa-f1-6])/i);
        // Explanation pattern: e.g. "Explanation: ..." or "Note: ..."
        const expMatch = line.match(/^(?:Explanation|Note|Why)[:\s]+(.+)$/i);

        if (qMatch) {
          flushCurrent();
          currentQ = {
            questionText: qMatch[3].trim(),
          };
        } else if (ansMatch && currentQ) {
          let letter = ansMatch[1].toUpperCase();
          if (['1', '2', '3', '4'].includes(letter)) {
            letter = ['A', 'B', 'C', 'D'][parseInt(letter) - 1];
          }
          currentQ.correctOptionId = letter;
        } else if (expMatch && currentQ) {
          currentQ.explanation = expMatch[1].trim();
        } else if (optMatch && currentQ) {
          let optId = optMatch[1].toUpperCase();
          if (['1', '2', '3', '4'].includes(optId)) {
            optId = ['A', 'B', 'C', 'D'][parseInt(optId) - 1];
          }
          let optText = optMatch[2].trim();
          // Check if option is marked with asterisks like *Option (correct)
          if (optText.startsWith('*')) {
            optText = optText.substring(1).trim();
            currentQ.correctOptionId = optId;
          }
          currentOptions.push({ id: optId, text: optText });
        } else if (!currentQ) {
          // If first line doesn't have number, treat it as question
          currentQ = { questionText: line };
        } else if (currentOptions.length === 0) {
          // Multiline question text
          currentQ.questionText += ' ' + line;
        }
      }

      flushCurrent();
    }

    if (questions.length === 0) {
      setParseError(
        'Could not detect any questions. Please check that your text follows the template format (CSV or numbered questions).'
      );
    }

    setParsedList(questions);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        parseRawContent(text);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        parseRawContent(text);
      }
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPasteText(val);
    parseRawContent(val);
  };

  const validQuestions = parsedList.filter((q) => q.isValid);
  const invalidCount = parsedList.length - validQuestions.length;

  const handleImport = (mode: 'append' | 'replace') => {
    if (validQuestions.length === 0) return;

    const formatted: Question[] = validQuestions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      options: q.options,
      correctOptionId: q.correctOptionId,
      explanation: q.explanation,
    }));

    onApplyQuestions(formatted, mode);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-upload-title"
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 to-indigo-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 id="bulk-upload-title" className="text-lg sm:text-xl font-extrabold text-slate-900">
                Bulk Upload Questions
              </h2>
              <p className="text-xs text-slate-500">
                Import dozens of multiple-choice questions from CSV, Excel, or formatted text
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector & Template Download */}
        <div className="px-5 sm:px-6 pt-4 pb-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Upload CSV File
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'paste'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Paste Text / Questions
            </button>
          </div>

          <button
            type="button"
            onClick={downloadQuestionTemplateCsv}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100/70 border border-blue-200/80 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            title="Download formatted CSV spreadsheet template with instructions"
          >
            <Download className="w-3.5 h-3.5" />
            Download Sample CSV Template
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'upload' ? (
            /* Upload File Tab */
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div className="w-12 h-12 rounded-2xl bg-blue-100/70 text-blue-600 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                  {fileName ? (
                    <span className="text-blue-600">Selected: {fileName}</span>
                  ) : (
                    'Click to upload or drag and drop a CSV file'
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Supports .csv and .txt files formatted with questions and options
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-700">CSV Column Order:</div>
                <div className="font-mono text-[11px] text-slate-500">
                  Question, Option A, Option B, Option C, Option D, Correct Option (A/B/C/D), Explanation
                </div>
              </div>
            </div>
          ) : (
            /* Paste Text Tab */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">Paste raw CSV or standard formatted text below:</span>
                <span className="text-slate-400">Auto-detected formatting</span>
              </div>
              <textarea
                value={pasteText}
                onChange={handlePasteChange}
                rows={8}
                placeholder={`Example Format 1 (Standard):
1. What is the capital of France?
A) Berlin
B) Madrid
C) Paris
D) Rome
Answer: C
Explanation: Paris is the capital of France.

Example Format 2 (CSV):
"What is 10 + 5?", "12", "15", "18", "20", "B", "10 plus 5 equals 15."`}
                className="w-full p-3 font-mono text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
          )}

          {parseError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Parsed Preview Section */}
          {parsedList.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">
                    Parsed Questions ({parsedList.length})
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3 h-3" /> {validQuestions.length} Ready
                  </span>
                  {invalidCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      <AlertCircle className="w-3 h-3" /> {invalidCount} with issues
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setParsedList([]);
                    setPasteText('');
                    setFileName(null);
                  }}
                  className="text-xs text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                >
                  Clear list
                </button>
              </div>

              {/* Scrollable list of preview questions */}
              <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-2xl p-3 bg-slate-50/50">
                {parsedList.map((q, idx) => (
                  <div
                    key={q.id}
                    className={`p-3 rounded-xl border text-xs transition-all ${
                      q.isValid
                        ? 'bg-white border-slate-200 shadow-2xs'
                        : 'bg-amber-50/80 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="font-semibold text-slate-800">
                        {idx + 1}. {q.questionText}
                      </div>
                      {!q.isValid && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                          {q.validationError}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-slate-600">
                      {q.options.map((opt) => {
                        const isCorrect = opt.id === q.correctOptionId;
                        return (
                          <div
                            key={opt.id}
                            className={`p-1.5 rounded-lg border text-[11px] truncate ${
                              isCorrect
                                ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-800'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <span className="font-bold mr-1">{opt.id}:</span>
                            {opt.text}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="mt-1.5 text-[11px] text-slate-500 italic">
                        💡 {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {existingQuestionsCount > 0 && (
              <span>Current exam has {existingQuestionsCount} question(s)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {validQuestions.length > 0 && existingQuestionsCount > 0 && (
              <button
                type="button"
                onClick={() => handleImport('append')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Append ({validQuestions.length})
              </button>
            )}

            <button
              type="button"
              onClick={() => handleImport(existingQuestionsCount > 0 ? 'replace' : 'append')}
              disabled={validQuestions.length === 0}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-sm shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {existingQuestionsCount > 0
                ? `Replace All (${validQuestions.length})`
                : `Import Questions (${validQuestions.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
