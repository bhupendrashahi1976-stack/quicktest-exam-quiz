import {
  Check,
  Copy,
  ExternalLink,
  Facebook,
  Mail,
  MessageCircle,
  Play,
  Send,
  Share2,
  Sparkles,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchExam } from '../lib/api';
import { ActivePage, Exam } from '../types';

interface ShareExamPageProps {
  examId: string;
  onNavigate: (page: ActivePage) => void;
}

export function ShareExamPage({ examId, onNavigate }: ShareExamPageProps) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExam(examId)
      .then((data) => setExam(data))
      .catch((err) => setError(err.message || 'Failed to load exam'))
      .finally(() => setIsLoading(false));
  }, [examId]);

  const examUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/exam/${examId}`
    : `https://quicktest.app/exam/${examId}`;

  const shareText = exam
    ? `Take this quick ${exam.title}! 🧠\nCan you get all the answers correct?\n${examUrl}`
    : `Take this quick test! 🧠\n${examUrl}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(examUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = examUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: exam?.title || 'QuickTest Quiz',
          text: `Take this quick ${exam?.title || 'test'}! 🧠 Can you get all the answers correct?`,
          url: examUrl,
        });
      } catch (err) {
        // User cancelled or not supported
      }
    } else {
      handleCopyLink();
    }
  };

  // Social share URLs
  const encodedUrl = encodeURIComponent(examUrl);
  const encodedText = encodeURIComponent(
    `Take this quick ${exam?.title || 'test'}! 🧠 Can you get all the answers correct?`
  );

  const socialLinks = [
    {
      name: 'WhatsApp',
      url: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
      bg: 'bg-emerald-600 hover:bg-emerald-700',
      icon: MessageCircle,
    },
    {
      name: 'Facebook',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      bg: 'bg-blue-600 hover:bg-blue-700',
      icon: Facebook,
    },
    {
      name: 'Telegram',
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      bg: 'bg-sky-500 hover:bg-sky-600',
      icon: Send,
    },
    {
      name: 'X (Twitter)',
      url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      bg: 'bg-slate-900 hover:bg-slate-800',
      icon: ExternalLink,
    },
    {
      name: 'Email',
      url: `mailto:?subject=${encodeURIComponent(exam?.title || 'QuickTest Quiz')}&body=${encodeURIComponent(
        `Hi!\n\nI invite you to take this test: ${exam?.title || 'Quiz'}\n\nLink: ${examUrl}`
      )}`,
      bg: 'bg-slate-700 hover:bg-slate-800',
      icon: Mail,
    },
  ];

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center text-slate-500">
        Loading share details...
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <p className="text-red-600 font-semibold">{error || 'Exam not found'}</p>
        <button
          onClick={() => onNavigate({ type: 'home' })}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Success Badge */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
          <Sparkles className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          🎉 Exam Published!
        </h1>
        <p className="text-slate-600 text-sm max-w-md mx-auto">
          Your exam is live and ready for participants. Anyone with this link can take the test without needing an account.
        </p>
      </div>

      {/* Share Link Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Exam Public Link
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm text-slate-800 truncate select-all">
              {examUrl}
            </div>
            <button
              onClick={handleCopyLink}
              className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all focus:outline-none focus:ring-2 ${
                copied
                  ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm'
              }`}
              id="share-btn-copy"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Link copied! ✓
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="pt-2 flex flex-wrap gap-3">
          <button
            onClick={() => onNavigate({ type: 'take-exam', examId })}
            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-sm rounded-xl border border-blue-200 transition-colors"
            id="share-btn-open-exam"
          >
            <Play className="w-4 h-4 fill-blue-700" />
            Open Exam
          </button>

          <button
            onClick={handleNativeShare}
            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-sm rounded-xl transition-colors"
            id="share-btn-native-share"
          >
            <Share2 className="w-4 h-4" />
            Share Exam
          </button>
        </div>
      </div>

      {/* Social Media Sharing */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900">
          Share to Social Media & Messaging
        </h2>
        <p className="text-xs text-slate-500">
          Click an app icon to instantly share the test with your students or audience:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {socialLinks.map((social) => {
            const Icon = social.icon;
            return (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-medium text-xs shadow-sm transition-transform active:scale-95 ${social.bg}`}
              >
                <Icon className="w-4 h-4" />
                {social.name}
              </a>
            );
          })}
        </div>
      </div>

      {/* Social Media Link Preview Mockup */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Social Link Preview (How it looks on WhatsApp/Facebook/X)
        </div>
        
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
          <div className="h-32 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 flex flex-col justify-center items-center text-white px-4 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full mb-1">
              QuickTest Quiz
            </span>
            <div className="text-lg font-bold line-clamp-1">{exam.title}</div>
            <div className="text-xs text-blue-100">{exam.questions.length} Multiple Choice Questions</div>
          </div>
          <div className="p-4 bg-white">
            <div className="text-xs text-slate-400 font-mono">QUICKTEST.APP / EXAM</div>
            <div className="font-bold text-slate-900 text-sm mt-0.5">{exam.title}</div>
            <div className="text-xs text-slate-500 line-clamp-2 mt-1">
              {exam.description || 'Test your knowledge with this quick online quiz.'}
            </div>
          </div>
        </div>
      </div>

      {/* Back to Exams / Home */}
      <div className="text-center pt-2">
        <button
          onClick={() => onNavigate({ type: 'my-exams' })}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-4"
        >
          View All My Exams →
        </button>
      </div>
    </div>
  );
}
