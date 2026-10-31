import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { Sidebar } from './components/layout/Sidebar';
import { TopNav } from './components/layout/TopNav';
import { SearchModal } from './components/layout/SearchModal';

import { type PageId } from './lib/nav';

import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { EditorPage } from './pages/EditorPage';
import { ScanPage } from './pages/ScanPage';
import { AIReviewPage } from './pages/AIReviewPage';
import { FixesPage } from './pages/FixesPage';
import { AuditPage } from './pages/AuditPage';
import { ReportsPage } from './pages/ReportsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage, type SettingsView } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { logout } from './services/authService';

import twMerge from './lib/twMerge';

function getPageFromHash(): PageId {
  const candidate = window.location.hash.replace(/^#\/?/, '').split('/')[0] as PageId;
  return candidate && candidate in NAVIGATION_PAGES ? candidate : 'dashboard';
}

function getSettingsViewFromHash(): SettingsView {
  const candidate = window.location.hash.replace(/^#\/?settings\/?/, '') as SettingsView;
  return candidate === 'preferences' || candidate === 'security' || candidate === 'profile' ? candidate : 'profile';
}

const NAVIGATION_PAGES: Record<PageId, true> = {
  dashboard: true, upload: true, editor: true, scan: true, 'ai-review': true,
  fixes: true, audit: true, reports: true, history: true, settings: true,
};


export default function App() {
  const [authenticated, setAuthenticated] = useState(
    () => Boolean(localStorage.getItem('access_token'))
  );

  const [page, setPage] = useState<PageId>(getPageFromHash);
  const [settingsView, setSettingsView] = useState<SettingsView>(getSettingsViewFromHash);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const PAGES: Record<PageId, () => JSX.Element> = {
    dashboard: () => (
  <DashboardPage onNavigate={(page) => navigate(page as PageId)} />
),
    upload: UploadPage,
    editor: EditorPage,
    scan: ScanPage,
    'ai-review': () => <AIReviewPage onNavigate={navigate} />,
    fixes: () => <FixesPage onNavigate={navigate} />,
    audit: AuditPage,
    reports: ReportsPage,
    history: HistoryPage,
    settings: () => <SettingsPage activeView={settingsView} onSelectView={navigateSettings} />,
  };

  function navigate(nextPage: PageId) {
    if (nextPage === 'settings') { navigateSettings('profile'); return; }
    window.location.hash = nextPage;
    setPage(nextPage);
  }

  function navigateSettings(view: SettingsView) {
    window.location.hash = `settings/${view}`;
    setPage('settings');
    setSettingsView(view);
  }

  useEffect(() => {
    const syncLocation = () => { setPage(getPageFromHash()); setSettingsView(getSettingsViewFromHash()); };
    window.addEventListener('hashchange', syncLocation);
    if (!window.location.hash) window.location.hash = 'dashboard';
    return () => window.removeEventListener('hashchange', syncLocation);
  }, []);
  useEffect(() => {
    const handler = () => {
      setSearchOpen(true);
    };

    document.addEventListener('open-search', handler);

    return () => {
      document.removeEventListener('open-search', handler);
    };
  }, []);

  useEffect(() => {
    const handleExpiredSession = () => setAuthenticated(false);
    window.addEventListener('auth-expired', handleExpiredSession);

    return () => {
      window.removeEventListener('auth-expired', handleExpiredSession);
    };
  }, []);

  // Show login page when there is no JWT token
  if (!authenticated) {
    return (
      <LoginPage
        onLogin={() => {
          setAuthenticated(true);
        }}
      />
    );
  }

  const Page = PAGES[page];

  return (
    <div className="min-h-screen">
      <Sidebar
        current={page}
        onNavigate={navigate}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div
        className={twMerge(
          'transition-all duration-300',
          collapsed ? 'lg:pl-[68px]' : 'lg:pl-64'
        )}
      >
        <TopNav
          onOpenMobile={() => setMobileOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenSettings={navigateSettings}
          onLogout={() => {
            logout();
            setAuthenticated(false);
          }}
        />

        <main className={twMerge('relative px-4 py-6 lg:px-8', page === 'ai-review' && 'lg:h-[calc(100dvh-4rem)] lg:overflow-hidden')}>
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              className={page === 'ai-review' ? 'h-full min-h-0' : undefined}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
            >
              <Page />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={navigate}
      />
    </div>
  );
}
