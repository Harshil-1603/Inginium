'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import DashboardLayout from '@/components/DashboardLayout';

interface FullUser {
  id: number;
  email: string;
  name: string;
  role: string;
  rollNumber?: string | null;
  departmentId?: number | null;
  clubId?: number | null;
  department?: { id: number; name: string } | null;
  club?: { id: number; name: string } | null;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Student',
  PROFESSOR: 'Professor',
  CLUB_MANAGER: 'Club Manager',
  LAB_TECH: 'Lab Technician',
  LHC: 'LHC Manager',
  ADMIN: 'System Admin',
};

const ROLE_COLORS: Record<string, string> = {
  STUDENT: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  PROFESSOR: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  CLUB_MANAGER: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  LAB_TECH: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  LHC: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  ADMIN: 'bg-[#00E599]/15 text-[#00E599] border-[#00E599]/30',
};

function InfoRow({ label, value }: { label: string; value: string | undefined | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-3 border-b border-zinc-800/60 last:border-b-0">
      <span className="text-xs text-zinc-500 font-medium">{label}</span>
      <span className="text-sm text-zinc-200">{value}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { authFetch, user: tokenUser } = useAuth();
  const [profile, setProfile] = useState<FullUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.success) setProfile(d.data); })
      .finally(() => setLoading(false));
  }, [authFetch]);

  return (
    <DashboardLayout title="Profile" subtitle="Your account information">
      <div className="max-w-lg">
        {loading ? (
          <div className="text-zinc-500 text-sm">Loading…</div>
        ) : profile ? (
          <div className="flex flex-col gap-5">
            {/* Avatar + name */}
            <div className="flex items-center gap-4 p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
              <div className="w-14 h-14 rounded-full bg-[#00E599]/10 border border-[#00E599]/30 flex items-center justify-center shrink-0">
                <span className="text-2xl font-bold text-[#00E599]">
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-100">{profile.name}</h2>
                <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border mt-1 ${ROLE_COLORS[profile.role] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                  {ROLE_LABELS[profile.role] ?? profile.role}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5">
              <InfoRow label="Email" value={profile.email} />
              {profile.rollNumber && <InfoRow label="Roll Number" value={profile.rollNumber} />}
              {profile.department && <InfoRow label="Department" value={profile.department.name} />}
              {profile.club && <InfoRow label="Club" value={profile.club.name} />}
              <InfoRow label="Account created" value={new Date(profile.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })} />
              <InfoRow label="User ID" value={`#${profile.id}`} />
            </div>

            {/* Auth info */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Security</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-300">Session expiry</p>
                  <p className="text-xs text-zinc-500 mt-0.5">JWT token valid for 12 hours</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">Active</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-red-400 text-sm">Failed to load profile.</p>
        )}
      </div>
    </DashboardLayout>
  );
}
