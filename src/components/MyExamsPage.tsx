import {
  BarChart3,
  Check,
  Clock,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FolderOpen,
  Play,
  PlusCircle,
  Share2,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { deleteExam, duplicateExam, fetchExams, fetchExamStats } from '../lib/api';
import { exportExamAttemptsToCsv } from '../lib/exportUtils';
import { ActivePage, Exam } from '../types';
import { StatsModal } from './StatsModal';

interface MyExamsPageProps {
  onNavigate: (page: ActivePage) => void;
}

export function MyExamsPage({ onNavigate }: MyExamsPageProps) {
  const [exams, setExams] = useState<(Exam & { attemptCount?: number; averageScore?: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatsExam, setSelectedStatsExam] = useState<Exam | null>(null);
  const [copiedExamId, setCopiedExamId] = useState<string | null>(null);

  const loadExams = async () => {
    setIsLoading(true);
    try {
      const list = await fetchExams();
      setExams(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load exams');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteExam(id);
      setExams((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete exam');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const duplicated = await duplicateExam(id);
      setExams((prev) => [duplicated, ...prev]);
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate exam');
    }
  };

  const handleExportCsv = async (exam: Exam) => {
    try {
      const stats = await fetchExamStats(exam.id);
      if (!stats.recentAttempts || stats.recentAttempts.length === 0) {
        alert('No attempts have been recorded for this exam yet.');
        return;
      }
      exportExamAttemptsToCsv(exam.title, stats.recentAttempts);
    } catch (err: any) {
      alert(err.message || 'Failed to export results');
    }
  };

  const handleCopyLink = async (id: string) => {
    const url = `${window.location.origin}/exam/${id}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedExamId(id);
      setTimeout(() => setCopiedExamId(null), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FolderOpen className="w-7 h-7 text-blue-600" />
            My Exams
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Manage your created tests, copy shareable links, and view participant score results.
          </p>
        </div>

        <button
          onClick={() => onNavigate({ type: 'create' })}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          id="my-exams-btn-new"
        >
          <PlusCircle className="w-4 h-4" />
          Create New Exam
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-500">Loading exams...</div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-semibold">{error}</div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No exams yet</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            You haven't created any exams yet. Create your first online multiple-choice quiz now!
          </p>
          <button
            onClick={() => onNavigate({ type: 'create' })}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700"
          >
            <PlusCircle className="w-4 h-4" />
            Create Exam
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              id={`exam-card-${exam.id}`}
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Published
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatDate(exam.createdAt)}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 leading-snug line-clamp-2">
                  {exam.title}
                </h3>

                {exam.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {exam.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                  <span className="font-semibold bg-slate-100 px-2 py-1 rounded-md">
                    {exam.questions.length} Questions
                  </span>
                  {exam.settings.timeLimitMinutes > 0 && (
                    <span className="font-medium text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {exam.settings.timeLimitMinutes}m
                    </span>
                  )}
                  <span className="text-slate-500">
                    Pass: {exam.settings.passingScorePercent}%
                  </span>
                  <span className="text-blue-600 font-semibold">
                    {exam.attemptCount ?? 0} Attempts
                  </span>
                </div>

                {/* Public Link Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-slate-600 truncate select-all">
                    /exam/{exam.id}
                  </span>
                  <button
                    onClick={() => handleCopyLink(exam.id)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-white transition-colors"
                    title="Copy Link"
                  >
                    {copiedExamId === exam.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons Bar: [Open] [Edit] [Duplicate] [Share] [Delete] */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => onNavigate({ type: 'take-exam', examId: exam.id })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs rounded-lg transition-colors"
                    title="Open / Take Test"
                  >
                    <Play className="w-3.5 h-3.5 fill-blue-700" />
                    Open
                  </button>

                  <button
                    onClick={() => onNavigate({ type: 'share', examId: exam.id })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-xs rounded-lg transition-colors"
                    title="Share Link"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </button>

                  <button
                    onClick={() => setSelectedStatsExam(exam)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                    title="View Analytics & Results"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Results
                  </button>

                  <button
                    onClick={() => handleExportCsv(exam)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                    title="Export participant results to CSV spreadsheet"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">CSV</span>
                  </button>

                  <button
                    onClick={() => onNavigate({ type: 'create', editExamId: exam.id })}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                    title="Edit Exam"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDuplicate(exam.id)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                    title="Duplicate Exam"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => handleDelete(exam.id, exam.title)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete Exam"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Modal */}
      {selectedStatsExam && (
        <StatsModal
          exam={selectedStatsExam}
          onClose={() => setSelectedStatsExam(null)}
        />
      )}
    </div>
  );
}
