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
import { BlockchainPage } from './pages/BlockchainPage';
import { ReportsPage } from './pages/ReportsPage';
import { HistoryPage } from './pages/HistoryPage';
import { TeamPage } from './pages/TeamPage';
import { ApiKeysPage } from './pages/ApiKeysPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';

import twMerge from './lib/twMerge';


export default function App() {
  const [authenticated, setAuthenticated] = useState(
    () => Boolean(localStorage.getItem('access_token'))
  );

  const [page, setPage] = useState<PageId>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const PAGES: Record<PageId, () => JSX.Element> = {
    dashboard: () => (
  <DashboardPage onNavigate={(page) => setPage(page as PageId)} />
),
    upload: UploadPage,
    editor: EditorPage,
    scan: ScanPage,
    'ai-review': AIReviewPage,
    fixes: FixesPage,
    blockchain: BlockchainPage,
    reports: ReportsPage,
    history: HistoryPage,
    team: TeamPage,
    'api-keys': ApiKeysPage,
    settings: SettingsPage,
  };
  useEffect(() => {
    const handler = () => {
      setSearchOpen(true);
    };

    document.addEventListener('open-search', handler);

    return () => {
      document.removeEventListener('open-search', handler);
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
        onNavigate={setPage}
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
        />

        <main className="relative px-4 py-6 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
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
        onNavigate={setPage}
      />
    </div>
  );
}