'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

// ─── SVG Icons ──────────────────────────────────────────────────────────────
const IconChevron = ({ open }: { open: boolean }) => (
    <svg
        width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ transition: 'transform 0.3s ease', transform: open ? 'rotate(0deg)' : 'rotate(180deg)' }}
    >
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const IconCalendar = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const IconProfile = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const IconResources = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
);

const IconSettings = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);

// ─── Nav item definition ────────────────────────────────────────────────────
const NAV_ITEMS = [
    { label: 'Profile', href: '/profile', icon: <IconProfile /> },
    { label: 'Resources', href: '/resources', icon: <IconResources /> },
    { label: 'Calendar', href: '/', icon: <IconCalendar /> },
];

const SETTINGS_ITEM = { label: 'Settings', href: '/settings', icon: <IconSettings /> };

// ─── Component ──────────────────────────────────────────────────────────────
export default function Sidebar() {
    const [open, setOpen] = useState(true);
    const pathname = usePathname();

    const isActive = (href: string) =>
        href === '/' ? pathname === '/' : pathname.startsWith(href);

    return (
        <aside
            style={{
                width: open ? '220px' : '60px',
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                flexShrink: 0,
            }}
            className="relative h-screen flex flex-col border-r border-zinc-800 bg-zinc-950 overflow-hidden"
        >
            {/* ── Header / Toggle ── */}
            <div className="flex items-center justify-between px-3 py-4 border-b border-zinc-800/60">
                {/* Logo */}
                <div
                    className="flex items-center gap-2.5 overflow-hidden"
                    style={{ opacity: open ? 1 : 0, transition: 'opacity 0.2s ease', whiteSpace: 'nowrap' }}
                >
                    <div className="w-7 h-7 rounded-md bg-[#00E599] flex items-center justify-center shrink-0">
                        <span className="text-black text-xs font-bold">I</span>
                    </div>
                    <span className="text-sm font-semibold text-zinc-100 tracking-tight">Inginium</span>
                </div>

                {/* Collapse toggle button */}
                <button
                    onClick={() => setOpen(!open)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors shrink-0 ml-auto"
                    title={open ? 'Collapse sidebar' : 'Expand sidebar'}
                >
                    <IconChevron open={open} />
                </button>
            </div>

            {/* ── Main Nav ── */}
            <nav className="flex flex-col gap-1 p-2 flex-1">
                {NAV_ITEMS.map(({ label, href, icon }) => {
                    const active = isActive(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            title={!open ? label : undefined}
                            className={`
                group relative flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium
                transition-colors duration-150 overflow-hidden
                ${active
                                    ? 'bg-zinc-800 text-zinc-50'
                                    : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                                }
              `}
                        >
                            {/* Active indicator bar */}
                            {active && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-[#00E599]" />
                            )}

                            {/* Icon */}
                            <span className={`shrink-0 ${active ? 'text-[#00E599]' : 'text-zinc-500 group-hover:text-zinc-300'} transition-colors`}>
                                {icon}
                            </span>

                            {/* Label */}
                            <span
                                style={{
                                    opacity: open ? 1 : 0,
                                    width: open ? 'auto' : '0px',
                                    transition: 'opacity 0.2s ease',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                }}
                            >
                                {label}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            {/* ── Settings (pinned to bottom) ── */}
            <div className="p-2 border-t border-zinc-800/60">
                {(() => {
                    const { label, href, icon } = SETTINGS_ITEM;
                    const active = isActive(href);
                    return (
                        <Link
                            href={href}
                            title={!open ? label : undefined}
                            className={`
                group relative flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium
                transition-colors duration-150 overflow-hidden
                ${active
                                    ? 'bg-zinc-800 text-zinc-50'
                                    : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                                }
              `}
                        >
                            {active && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-[#00E599]" />
                            )}
                            <span className={`shrink-0 ${active ? 'text-[#00E599]' : 'text-zinc-500 group-hover:text-zinc-300'} transition-colors`}>
                                {icon}
                            </span>
                            <span
                                style={{
                                    opacity: open ? 1 : 0,
                                    width: open ? 'auto' : '0px',
                                    transition: 'opacity 0.2s ease',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                }}
                            >
                                {label}
                            </span>
                        </Link>
                    );
                })()}
            </div>
        </aside>
    );
}
