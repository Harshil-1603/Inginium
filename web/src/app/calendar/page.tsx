'use client';

import DashboardLayout from '@/components/DashboardLayout';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import { useAuth } from '@/lib/useAuth';

export default function CalendarPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'LHC' || user?.role === 'ADMIN';

  return (
    <DashboardLayout title="LHC Room Calendar" subtitle="Weekly view of approved room bookings">
      <div className="h-[calc(100vh-8rem)]">
        <WeeklyCalendar canEdit={canEdit} />
      </div>
    </DashboardLayout>
  );
}
