import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  FileCheck,
  Link2,
  PenTool,
  Play,
  PlusCircle,
  Send,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { ActivePage } from '../types';

interface HomePageProps {
  onNavigate: (page: ActivePage) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const features = [
    {
      icon: PenTool,
      title: 'Create Questions',
      description: 'Easily draft unlimited multiple-choice questions with 4 options and set the single correct answer.',
      color: 'from-blue-500 to-indigo-600',
    },
    {
      icon: Link2,
      title: 'Share With One Link',
      description: 'Get an instant unique public exam link (e.g., /exam/DEMO01) ready to paste anywhere.',
      color: 'from-indigo-500 to-violet-600',
    },
    {
      icon: CheckCircle,
      title: 'Instant Answer Feedback',
      description: 'Participants get immediate visual validation (green check or red cross) with clear correct answers.',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      icon: BarChart3,
      title: 'Automatic Score',
      description: 'Calculates percentage, correct/wrong totals, pass/fail status, and time taken in real-time.',
      color: 'from-amber-500 to-orange-600',
    },
    {
      icon: Smartphone,
      title: 'Mobile Friendly',
      description: 'Carefully formatted for thumbs on phones, tablets, laptops, and wide desktop screens.',
      color: 'from-cyan-500 to-blue-600',
    },
    {
      icon: Send,
      title: 'Easy Social Sharing',
      description: 'One-click sharing for WhatsApp, Messenger, Facebook, Telegram, X, Email, and Instagram.',
      color: 'from-fuchsia-500 to-pink-600',
    },
  ];

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="text-center pt-8 pb-4 max-w-3xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-5">
          <Sparkles className="w-3.5 h-3.5" />
          Fast • Free • No Participant Login Needed
        </div>
        
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Create Online Tests & Quizzes in Minutes
        </h1>
        
        <p className="mt-4 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Create multiple-choice exams, share one simple link, and instantly see results.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <button
            onClick={() => onNavigate({ type: 'create' })}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md shadow-blue-500/25 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            id="home-btn-create"
          >
            <PlusCircle className="w-5 h-5" />
            Create New Exam
          </button>
          
          <button
            onClick={() => onNavigate({ type: 'take-exam', examId: 'DEMO01' })}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            id="home-btn-demo"
          >
            <Play className="w-5 h-5 text-blue-600 fill-blue-600" />
            Take a Demo Quiz
          </button>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900">
            Everything You Need for Effortless Testing
          </h2>
          <p className="text-slate-600 text-sm mt-1">
            Built for teachers, trainers, tutors, and quiz masters.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col items-start"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${feature.color} flex items-center justify-center text-white mb-4 shadow-sm`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Flow Preview */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 text-center mb-6">
            How It Works in 3 Simple Steps
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="bg-white/80 backdrop-blur p-5 rounded-xl border border-blue-100">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center mx-auto mb-3 text-sm">
                1
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Enter Questions</h3>
              <p className="text-xs text-slate-600">
                Type question prompt, 4 choices, and click radio on correct answer.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur p-5 rounded-xl border border-blue-100">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center mx-auto mb-3 text-sm">
                2
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Get Share Link</h3>
              <p className="text-xs text-slate-600">
                Publish and receive an instant unique link for WhatsApp, Messenger, etc.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur p-5 rounded-xl border border-blue-100">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center mx-auto mb-3 text-sm">
                3
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Instant Results</h3>
              <p className="text-xs text-slate-600">
                Participants see live feedback, score, and detailed answer review.
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => onNavigate({ type: 'create' })}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              Start creating your first exam now <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
