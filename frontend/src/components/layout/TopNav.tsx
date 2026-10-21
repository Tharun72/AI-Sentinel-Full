import { Menu, Search, Command, ChevronDown, User, Settings, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from '../ui/Dropdown';
import { getCurrentUser, type CurrentUser } from '../../services/authService';

export function TopNav({ onOpenMobile, onOpenSearch, onLogout }: { onOpenMobile: () => void; onOpenSearch: () => void; onLogout: () => void }) {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    void getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  const initials = user?.full_name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'US';

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="flex h-full items-center gap-3 px-4 lg:px-6">
        <button
          onClick={onOpenMobile}
          className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={18} />
        </button>

        <button
          onClick={onOpenSearch}
          className="group flex h-9 max-w-md flex-1 items-center gap-2.5 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-500 transition-colors hover:border-slate-400 hover:bg-white"
        >
          <Search size={15} />
          <span className="flex-1 text-left">Search projects, scans, CVEs…</span>
          <kbd className="hidden items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-500 sm:inline-flex">
            <Command size={10} /> K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onOpenSearch}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 sm:hidden"
          >
            <Search size={18} />
          </button>

          <Dropdown
            trigger={
              <span className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white py-1 pl-1 pr-2 hover:bg-slate-50">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-blue text-xs font-semibold text-white">
                  {initials}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-xs font-medium leading-tight text-slate-800">{user?.full_name ?? 'Account'}</span>
                  <span className="block text-[10px] capitalize leading-tight text-slate-500">{user?.role ?? 'Loading account'}</span>
                </span>
                <ChevronDown size={14} className="hidden text-slate-500 sm:block" />
              </span>
            }
          >
            {() => (
              <>
                <DropdownLabel>Account</DropdownLabel>
                <DropdownItem icon={<User size={15} />}>Profile</DropdownItem>
                <DropdownItem icon={<Settings size={15} />}>Preferences</DropdownItem>
                <DropdownSeparator />
                <DropdownItem icon={<LogOut size={15} />} onClick={onLogout}>Sign out</DropdownItem>
              </>
            )}
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
