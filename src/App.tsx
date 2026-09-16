/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { CreateExamPage } from './components/CreateExamPage';
import { HomePage } from './components/HomePage';
import { MyExamsPage } from './components/MyExamsPage';
import { Navbar } from './components/Navbar';
import { ResultPage } from './components/ResultPage';
import { ShareExamPage } from './components/ShareExamPage';
import { TakeExamPage } from './components/TakeExamPage';
import { ActivePage } from './types';

// Helper to determine active page from current URL
function parseUrlToPage(): ActivePage {
  const path = window.location.pathname;

  // /exam/:id
  const examMatch = path.match(/^\/exam\/([a-zA-Z0-9_-]+)/);
  if (examMatch) {
    return { type: 'take-exam', examId: examMatch[1] };
  }

  // /share/:id
  const shareMatch = path.match(/^\/share\/([a-zA-Z0-9_-]+)/);
  if (shareMatch) {
    return { type: 'share', examId: shareMatch[1] };
  }

  // /create or /edit/:id
  const editMatch = path.match(/^\/edit\/([a-zA-Z0-9_-]+)/);
  if (editMatch) {
    return { type: 'create', editExamId: editMatch[1] };
  }
  if (path === '/create') {
    return { type: 'create' };
  }

  // /my-exams
  if (path === '/my-exams' || path === '/exams') {
    return { type: 'my-exams' };
  }

  return { type: 'home' };
}

// Convert ActivePage to browser URL
function pageToUrl(page: ActivePage): string {
  switch (page.type) {
    case 'home':
      return '/';
    case 'create':
      return page.editExamId ? `/edit/${page.editExamId}` : '/create';
    case 'my-exams':
      return '/my-exams';
    case 'share':
      return `/share/${page.examId}`;
    case 'take-exam':
      return `/exam/${page.examId}`;
    case 'result':
      return `/exam/${page.exam.id}/result`;
    default:
      return '/';
  }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<ActivePage>(parseUrlToPage);

  // Sync state changes with browser history
  const navigate = (page: ActivePage) => {
    const url = pageToUrl(page);
    window.history.pushState(null, '', url);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle browser back / forward
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(parseUrlToPage());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Set document title according to page
  useEffect(() => {
    if (currentPage.type === 'home') {
      document.title = 'QuickTest — Create Online Exams & Quizzes';
    } else if (currentPage.type === 'create') {
      document.title = currentPage.editExamId ? 'Edit Exam — QuickTest' : 'Create Exam — QuickTest';
    } else if (currentPage.type === 'my-exams') {
      document.title = 'My Exams — QuickTest';
    } else if (currentPage.type === 'share') {
      document.title = 'Share Exam — QuickTest';
    } else if (currentPage.type === 'take-exam') {
      document.title = 'Take Exam — QuickTest';
    } else if (currentPage.type === 'result') {
      document.title = 'Exam Results — QuickTest';
    }
  }, [currentPage]);

  // If on the exam-taking page, we show a simplified header/view to keep participants focused
  const isTakingExam = currentPage.type === 'take-exam';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <Navbar currentPage={currentPage} onNavigate={navigate} />

      <main className="flex-1">
        {currentPage.type === 'home' && <HomePage onNavigate={navigate} />}

        {currentPage.type === 'create' && (
          <CreateExamPage
            editExamId={currentPage.editExamId}
            onNavigate={navigate}
          />
        )}

        {currentPage.type === 'share' && (
          <ShareExamPage examId={currentPage.examId} onNavigate={navigate} />
        )}

        {currentPage.type === 'take-exam' && (
          <TakeExamPage examId={currentPage.examId} onNavigate={navigate} />
        )}

        {currentPage.type === 'result' && (
          <ResultPage
            attempt={currentPage.attempt}
            exam={currentPage.exam}
            onNavigate={navigate}
          />
        )}

        {currentPage.type === 'my-exams' && (
          <MyExamsPage onNavigate={navigate} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700">QuickTest — Online Exam & Quiz Creator</p>
          <p>Create multiple-choice exams, share one simple link, and instantly see results.</p>
        </div>
      </footer>
    </div>
  );
}
