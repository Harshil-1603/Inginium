'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { useAuth } from '@/lib/useAuth';

// ─── Icons ──────────────────────────────────────────────────────────────────
const Icon = {
  Chevron: ({ open }: { open: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: 'transform 0.3s ease', transform: open ? 'rotate(0deg)' : 'rotate(180deg)' }}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  Dashboard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  Resources: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  Calendar: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Approvals: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  Rooms: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Logs: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  Profile: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Logout: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Requests: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

// Nav item — href may contain ?tab= query param
type NavItem = { label: string; href: string; icon: React.ReactNode };

const PROFILE_ITEM: NavItem = { label: 'Profile', href: '/profile', icon: <Icon.Profile /> };

function getNavItems(role: string): NavItem[] {
  switch (role) {
    case 'STUDENT':
      return [
        { label: 'Browse Resources', href: '/dashboard?tab=resources', icon: <Icon.Resources /> },
        { label: 'My Requests', href: '/dashboard?tab=requests', icon: <Icon.Requests /> },
        { label: 'Calendar', href: '/calendar', icon: <Icon.Calendar /> },
        PROFILE_ITEM,
      ];
    case 'PROFESSOR':
      return [
        { label: 'Dept Resources', href: '/dashboard?tab=resources', icon: <Icon.Resources /> },
        { label: 'Book a Room', href: '/dashboard?tab=rooms', icon: <Icon.Rooms /> },
        { label: 'My Requests', href: '/dashboard?tab=requests', icon: <Icon.Requests /> },
        { label: 'Calendar', href: '/calendar', icon: <Icon.Calendar /> },
        PROFILE_ITEM,
      ];
    case 'CLUB_MANAGER':
      return [
        { label: 'Club Resources', href: '/dashboard?tab=club', icon: <Icon.Resources /> },
        { label: 'Approve Requests', href: '/dashboard?tab=approvals', icon: <Icon.Approvals /> },
        { label: 'Request Dept Resources', href: '/dashboard?tab=dept', icon: <Icon.Resources /> },
        { label: 'Book a Room', href: '/dashboard?tab=rooms', icon: <Icon.Rooms /> },
        { label: 'Calendar', href: '/calendar', icon: <Icon.Calendar /> },
        PROFILE_ITEM,
      ];
    case 'LAB_TECH':
      return [
        { label: 'Approve Requests', href: '/dashboard', icon: <Icon.Approvals /> },
        PROFILE_ITEM,
      ];
    case 'LHC':
      return [
        { label: 'Room Bookings', href: '/dashboard?tab=approvals', icon: <Icon.Approvals /> },
        { label: 'Manage Calendar', href: '/dashboard?tab=calendar', icon: <Icon.Calendar /> },
        PROFILE_ITEM,
      ];
    case 'ADMIN':
      return [
        { label: 'Resource Requests', href: '/dashboard?tab=resources', icon: <Icon.Resources /> },
        { label: 'Room Bookings', href: '/dashboard?tab=rooms', icon: <Icon.Rooms /> },
        { label: 'Logs', href: '/dashboard?tab=logs', icon: <Icon.Logs /> },
        { label: 'Calendar', href: '/calendar', icon: <Icon.Calendar /> },
        PROFILE_ITEM,
      ];
    default:
      return [{ label: 'Dashboard', href: '/dashboard', icon: <Icon.Dashboard /> }, PROFILE_ITEM];
  }
}

// ─── Inner sidebar that can use useSearchParams ──────────────────────────────
function SidebarInner() {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');
  const { user, logout } = useAuth();
  const router = useRouter();

  const navItems = user ? getNavItems(user.role) : [];

  function isActive(href: string): boolean {
    if (href.includes('?tab=')) {
      const [path, tabParam] = href.split('?tab=');
      return pathname === path && currentTab === tabParam;
    }
    // Plain /dashboard with no tab — only active when no tab param either
    if (href === '/dashboard') {
      return pathname === '/dashboard' && !currentTab;
    }
    return pathname === href || pathname.startsWith(href + '/');
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside
      style={{ width: open ? '220px' : '60px', transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)', flexShrink: 0 }}
      className="relative h-screen flex flex-col border-r border-zinc-800 bg-zinc-950 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-zinc-800/60">
        <div
          className="flex items-center gap-2.5 overflow-hidden"
          style={{ opacity: open ? 1 : 0, transition: 'opacity 0.2s ease', whiteSpace: 'nowrap' }}
        >
          <div className="w-7 h-7 rounded-md bg-[#00E599] flex items-center justify-center shrink-0">
            <span className="text-black text-xs font-bold">I</span>
          </div>
          <span className="text-sm font-semibold text-zinc-100 tracking-tight">Inginium</span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors shrink-0 ml-auto"
        >
          <Icon.Chevron open={open} />
        </button>
      </div>

      {/* User info */}
      {user && open && (
        <div className="px-3 py-2.5 border-b border-zinc-800/40">
          <p className="text-xs font-medium text-zinc-300 truncate">{user.name}</p>
          <p className="text-[10px] text-zinc-600 capitalize mt-0.5">
            {user.role.toLowerCase().replace(/_/g, ' ')}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex flex-col gap-1 p-2 flex-1 overflow-y-auto">
        {navItems.map(({ label, href, icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              title={!open ? label : undefined}
              className={`group relative flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 overflow-hidden
                ${active ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'}`}
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-[#00E599]" />}
              <span className={`shrink-0 ${active ? 'text-[#00E599]' : 'text-zinc-500 group-hover:text-zinc-300'} transition-colors`}>
                {icon}
              </span>
              <span style={{ opacity: open ? 1 : 0, width: open ? 'auto' : '0px', transition: 'opacity 0.2s ease', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-zinc-800/60">
        <button
          onClick={handleLogout}
          title={!open ? 'Sign out' : undefined}
          className="w-full group relative flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 transition-colors overflow-hidden"
        >
          <span className="shrink-0 text-zinc-500 group-hover:text-zinc-300 transition-colors">
            <Icon.Logout />
          </span>
          <span style={{ opacity: open ? 1 : 0, width: open ? 'auto' : '0px', transition: 'opacity 0.2s ease', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            Sign out
          </span>
        </button>
      </div>
    </aside>
  );
}

// Wrap in Suspense because useSearchParams needs it
export default function Sidebar() {
  return (
    <Suspense fallback={
      <aside className="w-[220px] h-screen border-r border-zinc-800 bg-zinc-950 shrink-0" />
    }>
      <SidebarInner />
    </Suspense>
  );
}
