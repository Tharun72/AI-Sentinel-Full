import { Bell, Menu, Search, Command, ChevronDown, User, Settings, LogOut, HelpCircle } from 'lucide-react';
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';

export function TopNav({ onOpenMobile, onOpenSearch }: { onOpenMobile: () => void; onOpenSearch: () => void }) {
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-white/[0.06] bg-bg-base/70 backdrop-blur-2xl">
      <div className="flex h-full items-center gap-3 px-4 lg:px-6">
        <button
          onClick={onOpenMobile}
          className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 hover:bg-white/[0.06] lg:hidden"
        >
          <Menu size={18} />
        </button>

        <button
          onClick={onOpenSearch}
          className="group flex h-9 flex-1 max-w-md items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-slate-400 transition-colors hover:border-white/15 hover:bg-white/[0.05]"
        >
          <Search size={15} />
          <span className="flex-1 text-left">Search projects, scans, CVEs…</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-400">
            <Command size={10} /> K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onOpenSearch}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 hover:bg-white/[0.06] sm:hidden"
          >
            <Search size={18} />
          </button>

          <Dropdown
            trigger={
              <span className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-300 hover:bg-white/[0.06]">
                <Bell size={18} />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-red" />
              </span>
            }
          >
            {(close) => (
              <>
                <DropdownLabel>Notifications</DropdownLabel>
                <div className="max-h-80 overflow-y-auto scrollbar-thin">
                  {[
                    { t: 'Critical vuln found', d: 'payment-gateway · SQL Injection', tone: 'red' as const },
                    { t: 'AI fix accepted', d: 'auth-service · CSRF patch', tone: 'emerald' as const },
                    { t: 'Scan completed', d: 'user-profile-api · 7 findings', tone: 'blue' as const },
                    { t: 'Blockchain verified', d: 'Patch 0x9f2a…b1c7', tone: 'cyan' as const },
                  ].map((n, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-white/[0.04]">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-${n.tone}`} />
                      <div>
                        <div className="text-sm text-slate-200">{n.t}</div>
                        <div className="text-xs text-slate-400">{n.d}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <DropdownSeparator />
                <DropdownItem onClick={close}>View all notifications</DropdownItem>
              </>
            )}
          </Dropdown>

          <Dropdown
            trigger={
              <span className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-1 pl-1 pr-2 hover:bg-white/[0.06]">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-blue to-brand-cyan text-xs font-semibold text-white">
                  MO
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-xs font-medium text-slate-100 leading-tight">Maya Okafor</span>
                  <span className="block text-[10px] text-slate-400 leading-tight">Owner</span>
                </span>
                <ChevronDown size={14} className="hidden text-slate-400 sm:block" />
              </span>
            }
          >
            {() => (
              <>
                <DropdownLabel>Account</DropdownLabel>
                <DropdownItem icon={<User size={15} />}>Profile</DropdownItem>
                <DropdownItem icon={<Settings size={15} />}>Preferences</DropdownItem>
                <DropdownItem icon={<HelpCircle size={15} />}>Support</DropdownItem>
                <DropdownSeparator />
                <DropdownItem icon={<LogOut size={15} />}>Sign out</DropdownItem>
              </>
            )}
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
