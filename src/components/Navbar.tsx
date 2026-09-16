import { CheckCircle2, FileQuestion, FolderOpen, Menu, PlusCircle, X } from 'lucide-react';
import { useState } from 'react';
import { ActivePage } from '../types';

interface NavbarProps {
  currentPage: ActivePage;
  onNavigate: (page: ActivePage) => void;
}

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isHome = currentPage.type === 'home';
  const isCreate = currentPage.type === 'create';
  const isMyExams = currentPage.type === 'my-exams' || currentPage.type === 'stats';

  const handleNav = (page: ActivePage) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => handleNav({ type: 'home' })}
          className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg p-1"
          id="nav-brand-btn"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="font-bold text-lg text-slate-900 leading-tight tracking-tight">
              QuickTest
            </div>
            <div className="text-[11px] font-medium text-slate-500 leading-none">
              Online Exam & Quiz Creator
            </div>
          </div>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
          <button
            onClick={() => handleNav({ type: 'home' })}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              isHome
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            id="nav-link-home"
          >
            Home
          </button>
          <button
            onClick={() => handleNav({ type: 'create' })}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              isCreate
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            id="nav-link-create"
          >
            <PlusCircle className="w-4 h-4" />
            Create Exam
          </button>
          <button
            onClick={() => handleNav({ type: 'my-exams' })}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              isMyExams
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            id="nav-link-my-exams"
          >
            <FolderOpen className="w-4 h-4" />
            My Exams
          </button>
        </nav>

        {/* Quick action button */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => handleNav({ type: 'create' })}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            id="nav-quick-create-btn"
          >
            <PlusCircle className="w-4 h-4" />
            New Exam
          </button>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          id="nav-mobile-menu-toggle"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-4 space-y-1 shadow-lg animate-in slide-in-from-top-2">
          <button
            onClick={() => handleNav({ type: 'home' })}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-base font-medium ${
              isHome ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileQuestion className="w-5 h-5 text-blue-600" />
            Home
          </button>
          <button
            onClick={() => handleNav({ type: 'create' })}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-base font-medium ${
              isCreate ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <PlusCircle className="w-5 h-5 text-blue-600" />
            Create Exam
          </button>
          <button
            onClick={() => handleNav({ type: 'my-exams' })}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-base font-medium ${
              isMyExams ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FolderOpen className="w-5 h-5 text-blue-600" />
            My Exams
          </button>
        </div>
      )}
    </header>
  );
}
