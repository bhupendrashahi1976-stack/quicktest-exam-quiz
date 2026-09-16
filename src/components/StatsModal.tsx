import {
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  TrendingUp,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchExamStats } from '../lib/api';
import { exportExamAttemptsToCsv } from '../lib/exportUtils';
import { Exam, ExamStats } from '../types';

interface StatsModalProps {
  exam: Exam;
  onClose: () => void;
}

export function StatsModal({ exam, onClose }: StatsModalProps) {
  const [stats, setStats] = useState<ExamStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchExamStats(exam.id)
      .then((data) => setStats(data))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, [exam.id]);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              <BarChart3 className="w-4 h-4" />
              Exam Analytics
            </div>
            <h2 className="text-xl font-bold text-slate-900 line-clamp-1">{exam.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500">Loading analytics...</div>
          ) : !stats || stats.totalAttempts === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800">No attempts yet</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Share this exam link with students or participants to see their scores and pass rates here!
              </p>
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                  <span className="text-slate-500 text-xs font-medium block mb-1">Total Attempts</span>
                  <span className="text-2xl font-black text-slate-900">{stats.totalAttempts}</span>
                </div>

                <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-100">
                  <span className="text-blue-700 text-xs font-medium block mb-1">Average Score</span>
                  <span className="text-2xl font-black text-blue-900">{stats.averageScore}%</span>
                </div>

                <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100">
                  <span className="text-emerald-700 text-xs font-medium block mb-1">Highest Score</span>
                  <span className="text-2xl font-black text-emerald-900">{stats.highestScore}%</span>
                </div>

                <div className="bg-purple-50/60 p-3.5 rounded-2xl border border-purple-100">
                  <span className="text-purple-700 text-xs font-medium block mb-1">Pass Rate</span>
                  <span className="text-2xl font-black text-purple-900">{stats.passRate}%</span>
                </div>
              </div>

              {/* Table of Attempts */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Recent Participant Submissions</h3>
                  {stats.recentAttempts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => exportExamAttemptsToCsv(exam.title, stats.recentAttempts)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      title="Download participant results as an Excel-ready CSV spreadsheet"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export Results (CSV)
                    </button>
                  )}
                </div>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0">
                        <tr>
                          <th className="p-3">Participant</th>
                          <th className="p-3">Score</th>
                          <th className="p-3">Percentage</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {stats.recentAttempts.map((att) => (
                          <tr key={att.id} className="hover:bg-slate-50/70">
                            <td className="p-3 font-semibold text-slate-900 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              {att.participantName || 'Anonymous'}
                            </td>
                            <td className="p-3">
                              {att.correctAnswers} / {att.totalQuestions}
                            </td>
                            <td className="p-3 font-bold">
                              {att.scorePercent}%
                            </td>
                            <td className="p-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                  att.passed
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {att.passed ? 'Passed' : 'Failed'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-400">
                              {formatDate(att.submittedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
