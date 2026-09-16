import { ExamAttempt } from '../types';

/**
 * Escapes a field for CSV export
 */
function escapeCsv(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Downloads a text or CSV string as a file in the user's browser
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports all exam attempts to a clean, Excel-compatible CSV file
 */
export function exportExamAttemptsToCsv(examTitle: string, attempts: ExamAttempt[]) {
  const headers = [
    'Attempt ID',
    'Participant Name',
    'Score (%)',
    'Result Status',
    'Correct Answers',
    'Wrong Answers',
    'Total Questions',
    'Time Taken (Seconds)',
    'Time Taken (Formatted)',
    'Submission Date',
  ];

  const rows = attempts.map((att) => {
    const totalSecs = att.timeTakenSeconds || 0;
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const timeFormatted = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    let formattedDate = att.submittedAt;
    try {
      formattedDate = new Date(att.submittedAt).toLocaleString();
    } catch {}

    return [
      escapeCsv(att.id),
      escapeCsv(att.participantName || 'Anonymous Participant'),
      escapeCsv(att.scorePercent),
      escapeCsv(att.passed ? 'PASSED' : 'FAILED'),
      escapeCsv(att.correctAnswers),
      escapeCsv(att.wrongAnswers),
      escapeCsv(att.totalQuestions),
      escapeCsv(totalSecs),
      escapeCsv(timeFormatted),
      escapeCsv(formattedDate),
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const safeTitle = (examTitle || 'Exam').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${safeTitle}_Results_${dateStr}.csv`;

  downloadFile(csvContent, filename);
}

/**
 * Exports a single participant scorecard to CSV
 */
export function exportParticipantScorecardCsv(examTitle: string, attempt: ExamAttempt) {
  const totalSecs = attempt.timeTakenSeconds || 0;
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const timeFormatted = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  let formattedDate = attempt.submittedAt;
  try {
    formattedDate = new Date(attempt.submittedAt).toLocaleString();
  } catch {}

  const headers = ['Field', 'Value'];
  const data = [
    ['Exam Title', examTitle],
    ['Participant Name', attempt.participantName || 'Anonymous'],
    ['Final Score', `${attempt.scorePercent}%`],
    ['Result Status', attempt.passed ? 'PASSED' : 'FAILED'],
    ['Correct Answers', attempt.correctAnswers],
    ['Wrong Answers', attempt.wrongAnswers],
    ['Total Questions', attempt.totalQuestions],
    ['Time Taken', timeFormatted],
    ['Date Submitted', formattedDate],
    ['Attempt ID', attempt.id],
  ];

  const csvContent = [
    headers.join(','),
    ...data.map(([f, v]) => `${escapeCsv(f)},${escapeCsv(v)}`),
  ].join('\r\n');

  const safeTitle = (examTitle || 'Quiz').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
  const safeName = (attempt.participantName || 'Participant').replace(/[^a-zA-Z0-9_-]/g, '_');
  downloadFile(csvContent, `${safeTitle}_${safeName}_Scorecard.csv`);
}

/**
 * Convenient alias for exporting single scorecard CSV
 */
export const exportSingleScorecardCsv = (exam: { title: string }, attempt: ExamAttempt) => {
  exportParticipantScorecardCsv(exam.title, attempt);
};

/**
 * Downloads a starter CSV template for bulk question upload
 */
export function downloadQuestionTemplateCsv() {
  const headers = ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Option', 'Explanation'];
  const sampleRows = [
    [
      'What is the primary function of Random Access Memory (RAM)?',
      'Long term storage',
      'High-speed volatile temporary memory',
      'Power supply regulator',
      'Network routing',
      'B',
      'RAM holds working data and instructions currently being processed by the CPU.',
    ],
    [
      'Which planet in our solar system is nicknamed the Red Planet?',
      'Venus',
      'Mars',
      'Jupiter',
      'Mercury',
      'B',
      'Mars appears red due to iron oxide (rust) on its surface.',
    ],
    [
      'What is 15 multiplied by 4?',
      '45',
      '50',
      '60',
      '75',
      'C',
      '15 * 4 = 60.',
    ],
    [
      'Which language runs natively inside web browsers?',
      'Python',
      'Java',
      'JavaScript',
      'C++',
      'C',
      'JavaScript is the standard programming language for web browsers.',
    ],
  ];

  const content = [
    headers.map(escapeCsv).join(','),
    ...sampleRows.map((row) => row.map(escapeCsv).join(',')),
  ].join('\r\n');

  downloadFile(content, 'quicktest_questions_template.csv');
}
