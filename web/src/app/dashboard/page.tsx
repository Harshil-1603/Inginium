'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useAuth } from '@/lib/useAuth';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import ResourceCard from '@/components/ResourceCard';
import RequestModal from '@/components/RequestModal';
import ApprovalsTable from '@/components/ApprovalsTable';
import WeeklyCalendar from '@/components/WeeklyCalendar';

/**
 * Hook that reads the current ?tab= param AND updates when the URL changes.
 * This makes sidebar links (which change the URL) immediately reflect in the
 * dashboard's active tab without a full page reload.
 */
function useTabFromUrl(defaultTab: string) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || defaultTab);

  useEffect(() => {
    const urlTab = searchParams.get('tab');
    setTab(urlTab || defaultTab);
  }, [searchParams, defaultTab]);

  return [tab, setTab] as const;
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface Resource {
  id: number;
  name: string;
  description?: string | null;
  quantity: number;
  ownerType: 'CLUB' | 'DEPARTMENT';
  department?: { id: number; name: string } | null;
  club?: { id: number; name: string } | null;
}

interface Request {
  id: number;
  resource: { name: string };
  quantity: number;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'WAITLISTED' | 'OVERRIDDEN';
  rollNumber?: string | null;
  reason?: string | null;
  requester: { id: number; name: string; email: string; role: string };
}

interface RoomBooking {
  id: number;
  room: { name: string };
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'WAITLISTED' | 'OVERRIDDEN';
  purpose?: string | null;
  requester: { id: number; name: string; role: string };
}

interface Room {
  id: number;
  name: string;
  capacity: number;
}

// ─── Student Dashboard ───────────────────────────────────────────────────────
function StudentDashboard() {
  const { authFetch, user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [myRequests, setMyRequests] = useState<Request[]>([]);
  const [modalResource, setModalResource] = useState<{ id: number; name: string; qty: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useTabFromUrl('resources');

  const load = useCallback(async () => {
    const [rRes, reqRes] = await Promise.all([
      authFetch('/api/resources'),
      authFetch('/api/resources/request?mine=true'),
    ]);
    const [rData, reqData] = await Promise.all([rRes.json(), reqRes.json()]);
    if (rData.success) setResources(rData.data);
    if (reqData.success) setMyRequests(reqData.data);
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  const handleRequest = async (data: Parameters<React.ComponentProps<typeof RequestModal>['onSubmit']>[0]) => {
    const res = await authFetch('/api/resources/request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    await load();
  };

  const handleAction = async (id: number, action: string) => {
    await authFetch('/api/approvals', {
      method: 'POST',
      body: JSON.stringify({ entityType: 'RESOURCE_REQUEST', entityId: id, action }),
    });
    await load();
  };

  return (
    <DashboardLayout title="Student Dashboard" subtitle={`Welcome, ${user?.name}`}>
      <div className="flex gap-2 mb-6">
        {(['resources', 'requests'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {t === 'resources' ? 'Browse Resources' : 'My Requests'}
          </button>
        ))}
      </div>

      {tab === 'resources' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? <p className="text-zinc-500 text-sm col-span-full">Loading…</p> :
            resources.map((r) => (
              <ResourceCard key={r.id} id={r.id} name={r.name} description={r.description}
                quantity={r.quantity} ownerType={r.ownerType}
                ownerName={r.department?.name || r.club?.name || '—'}
                onRequest={(id, name) => setModalResource({ id, name, qty: r.quantity })} />
            ))
          }
        </div>
      )}

      {tab === 'requests' && (
        <ApprovalsTable
          rows={myRequests.map((r) => ({
            id: r.id, entityName: r.resource.name, requesterName: r.requester.name,
            requesterRole: r.requester.role, quantity: r.quantity,
            startTime: r.startTime, endTime: r.endTime, status: r.status,
            rollNumber: r.rollNumber, reason: r.reason,
          }))}
          entityType="RESOURCE_REQUEST"
          onAction={handleAction}
          allowedActions={['CANCEL']}
          loading={loading}
        />
      )}

      {modalResource && (
        <RequestModal resourceId={modalResource.id} resourceName={modalResource.name}
          maxQuantity={modalResource.qty} onClose={() => setModalResource(null)}
          onSubmit={handleRequest} requireRollNumber />
      )}
    </DashboardLayout>
  );
}

// ─── Professor Dashboard ─────────────────────────────────────────────────────
function ProfessorDashboard() {
  const { authFetch, user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [myRequests, setMyRequests] = useState<Request[]>([]);
  const [myBookings, setMyBookings] = useState<RoomBooking[]>([]);
  const [modalResource, setModalResource] = useState<{ id: number; name: string; qty: number } | null>(null);
  const [tab, setTab] = useTabFromUrl('resources');
  const [roomForm, setRoomForm] = useState({ roomId: '', startTime: '', endTime: '', purpose: '' });
  const [roomError, setRoomError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [rRes, roomsRes, reqRes, bookRes] = await Promise.all([
      authFetch('/api/resources?ownerType=DEPARTMENT'),
      authFetch('/api/rooms'),
      authFetch('/api/resources/request?mine=true'),
      authFetch('/api/rooms/book?mine=true'),
    ]);
    const [rData, roomsData, reqData, bookData] = await Promise.all([rRes.json(), roomsRes.json(), reqRes.json(), bookRes.json()]);
    if (rData.success) setResources(rData.data.filter((r: Resource) => r.ownerType === 'DEPARTMENT'));
    if (roomsData.success) setRooms(roomsData.data);
    if (reqData.success) setMyRequests(reqData.data);
    if (bookData.success) setMyBookings(bookData.data);
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  const handleRequest = async (data: Parameters<React.ComponentProps<typeof RequestModal>['onSubmit']>[0]) => {
    const res = await authFetch('/api/resources/request', { method: 'POST', body: JSON.stringify(data) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    await load();
  };

  const handleBookRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoomError('');
    const res = await authFetch('/api/rooms/book', {
      method: 'POST',
      body: JSON.stringify({ ...roomForm, roomId: parseInt(roomForm.roomId) }),
    });
    const json = await res.json();
    if (!res.ok) { setRoomError(json.error); return; }
    setRoomForm({ roomId: '', startTime: '', endTime: '', purpose: '' });
    await load();
  };

  const handleAction = async (id: number, action: string) => {
    await authFetch('/api/approvals', {
      method: 'POST',
      body: JSON.stringify({ entityType: 'RESOURCE_REQUEST', entityId: id, action }),
    });
    await load();
  };

  return (
    <DashboardLayout title="Professor Dashboard" subtitle={user?.name}>
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['resources', 'rooms', 'requests', 'calendar'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {t === 'resources' ? 'Dept Resources' : t === 'rooms' ? 'Book Room' : t === 'requests' ? 'My Requests' : 'Calendar'}
          </button>
        ))}
      </div>

      {tab === 'resources' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? <p className="text-zinc-500 text-sm col-span-full">Loading…</p> :
            resources.map((r) => (
              <ResourceCard key={r.id} id={r.id} name={r.name} description={r.description}
                quantity={r.quantity} ownerType="DEPARTMENT"
                ownerName={r.department?.name || '—'}
                onRequest={(id, name) => setModalResource({ id, name, qty: r.quantity })} />
            ))
          }
        </div>
      )}

      {tab === 'rooms' && (
        <div className="max-w-md">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Book a Room</h2>
          <form onSubmit={handleBookRoom} className="flex flex-col gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Room</label>
              <select value={roomForm.roomId} onChange={(e) => setRoomForm(f => ({ ...f, roomId: e.target.value }))} required
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:border-[#00E599] transition-colors">
                <option value="">Select a room…</option>
                {rooms.map((r) => <option key={r.id} value={r.id}>{r.name} (cap: {r.capacity})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Start</label>
                <input type="datetime-local" value={roomForm.startTime} onChange={(e) => setRoomForm(f => ({ ...f, startTime: e.target.value }))} required
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:border-[#00E599] transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">End</label>
                <input type="datetime-local" value={roomForm.endTime} onChange={(e) => setRoomForm(f => ({ ...f, endTime: e.target.value }))} required
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:border-[#00E599] transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Purpose</label>
              <input type="text" value={roomForm.purpose} onChange={(e) => setRoomForm(f => ({ ...f, purpose: e.target.value }))} placeholder="e.g. Lecture, Meeting"
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:border-[#00E599] transition-colors" />
            </div>
            {roomError && <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">{roomError}</p>}
            <button type="submit" className="py-2.5 rounded-lg bg-[#00E599] text-zinc-950 text-sm font-semibold hover:bg-[#00c97f] transition-colors">
              Request Booking
            </button>
          </form>

          {myBookings.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">My Room Bookings</h3>
              <div className="flex flex-col gap-2">
                {myBookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-sm">
                    <div>
                      <p className="font-medium text-zinc-200">{b.room.name}</p>
                      <p className="text-xs text-zinc-500">{new Date(b.startTime).toLocaleString()}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${b.status === 'APPROVED' ? 'bg-green-500/15 text-green-400 border-green-500/30' : b.status === 'WAITLISTED' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'}`}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'requests' && (
        <ApprovalsTable
          rows={myRequests.map((r) => ({
            id: r.id, entityName: r.resource.name, requesterName: r.requester.name,
            requesterRole: r.requester.role, quantity: r.quantity,
            startTime: r.startTime, endTime: r.endTime, status: r.status,
          }))}
          entityType="RESOURCE_REQUEST" onAction={handleAction} allowedActions={['CANCEL']} loading={loading}
        />
      )}

      {tab === 'calendar' && <div className="h-[calc(100vh-12rem)]"><WeeklyCalendar /></div>}

      {modalResource && (
        <RequestModal resourceId={modalResource.id} resourceName={modalResource.name}
          maxQuantity={modalResource.qty} onClose={() => setModalResource(null)} onSubmit={handleRequest} />
      )}
    </DashboardLayout>
  );
}

// ─── Club Manager Dashboard ───────────────────────────────────────────────────
function ClubManagerDashboard() {
  const { authFetch, user } = useAuth();
  const [clubResources, setClubResources] = useState<Resource[]>([]);
  const [deptResources, setDeptResources] = useState<Resource[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Request[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [myBookings, setMyBookings] = useState<RoomBooking[]>([]);
  const [modalResource, setModalResource] = useState<{ id: number; name: string; qty: number } | null>(null);
  const [tab, setTab] = useTabFromUrl('club');
  const [roomForm, setRoomForm] = useState({ roomId: '', startTime: '', endTime: '', purpose: '' });
  const [roomError, setRoomError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [rRes, roomsRes, approvalRes, bookRes] = await Promise.all([
      authFetch('/api/resources'),
      authFetch('/api/rooms'),
      authFetch('/api/resources/request?status=PENDING'),
      authFetch('/api/rooms/book?mine=true'),
    ]);
    const [rData, roomsData, approvalData, bookData] = await Promise.all([rRes.json(), roomsRes.json(), approvalRes.json(), bookRes.json()]);
    if (rData.success) {
      setClubResources(rData.data.filter((r: Resource) => r.ownerType === 'CLUB'));
      setDeptResources(rData.data.filter((r: Resource) => r.ownerType === 'DEPARTMENT'));
    }
    if (roomsData.success) setRooms(roomsData.data);
    if (approvalData.success) setPendingRequests(approvalData.data);
    if (bookData.success) setMyBookings(bookData.data);
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  const handleRequest = async (data: Parameters<React.ComponentProps<typeof RequestModal>['onSubmit']>[0]) => {
    const res = await authFetch('/api/resources/request', { method: 'POST', body: JSON.stringify(data) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    await load();
  };

  const handleApprovalAction = async (id: number, action: string) => {
    await authFetch('/api/approvals', {
      method: 'POST',
      body: JSON.stringify({ entityType: 'RESOURCE_REQUEST', entityId: id, action }),
    });
    await load();
  };

  const handleBookRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoomError('');
    const res = await authFetch('/api/rooms/book', {
      method: 'POST',
      body: JSON.stringify({ ...roomForm, roomId: parseInt(roomForm.roomId) }),
    });
    const json = await res.json();
    if (!res.ok) { setRoomError(json.error); return; }
    setRoomForm({ roomId: '', startTime: '', endTime: '', purpose: '' });
    await load();
  };

  return (
    <DashboardLayout title="Club Manager Dashboard" subtitle={user?.name}>
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['club', 'dept', 'approvals', 'rooms', 'calendar'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {t === 'club' ? 'Club Resources' : t === 'dept' ? 'Request Dept Resources' : t === 'approvals' ? 'Approve Requests' : t === 'rooms' ? 'Book Room' : 'Calendar'}
          </button>
        ))}
      </div>

      {tab === 'club' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? <p className="text-zinc-500 text-sm col-span-full">Loading…</p> :
            clubResources.map((r) => (
              <ResourceCard key={r.id} id={r.id} name={r.name} description={r.description}
                quantity={r.quantity} ownerType="CLUB" ownerName={r.club?.name || '—'} />
            ))
          }
        </div>
      )}

      {tab === 'dept' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {deptResources.map((r) => (
            <ResourceCard key={r.id} id={r.id} name={r.name} description={r.description}
              quantity={r.quantity} ownerType="DEPARTMENT" ownerName={r.department?.name || '—'}
              onRequest={(id, name) => setModalResource({ id, name, qty: r.quantity })} />
          ))}
        </div>
      )}

      {tab === 'approvals' && (
        <ApprovalsTable
          rows={pendingRequests.map((r) => ({
            id: r.id, entityName: r.resource.name, requesterName: r.requester.name,
            requesterRole: r.requester.role, quantity: r.quantity,
            startTime: r.startTime, endTime: r.endTime, status: r.status, reason: r.reason,
          }))}
          entityType="RESOURCE_REQUEST" onAction={handleApprovalAction}
          allowedActions={['APPROVE', 'REJECT']} loading={loading}
        />
      )}

      {tab === 'rooms' && (
        <div className="max-w-md">
          <form onSubmit={handleBookRoom} className="flex flex-col gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300">Book a Room</h2>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Room</label>
              <select value={roomForm.roomId} onChange={(e) => setRoomForm(f => ({ ...f, roomId: e.target.value }))} required
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:border-[#00E599] transition-colors">
                <option value="">Select a room…</option>
                {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Start</label>
                <input type="datetime-local" value={roomForm.startTime} onChange={(e) => setRoomForm(f => ({ ...f, startTime: e.target.value }))} required
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:border-[#00E599] transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">End</label>
                <input type="datetime-local" value={roomForm.endTime} onChange={(e) => setRoomForm(f => ({ ...f, endTime: e.target.value }))} required
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:border-[#00E599] transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Purpose</label>
              <input type="text" value={roomForm.purpose} onChange={(e) => setRoomForm(f => ({ ...f, purpose: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:border-[#00E599] transition-colors" />
            </div>
            {roomError && <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">{roomError}</p>}
            <button type="submit" className="py-2.5 rounded-lg bg-[#00E599] text-zinc-950 text-sm font-semibold hover:bg-[#00c97f] transition-colors">
              Request Booking
            </button>
          </form>
        </div>
      )}

      {tab === 'calendar' && <div className="h-[calc(100vh-12rem)]"><WeeklyCalendar /></div>}

      {modalResource && (
        <RequestModal resourceId={modalResource.id} resourceName={modalResource.name}
          maxQuantity={modalResource.qty} onClose={() => setModalResource(null)} onSubmit={handleRequest} />
      )}
    </DashboardLayout>
  );
}

// ─── Lab Tech Dashboard ───────────────────────────────────────────────────────
function LabTechDashboard() {
  const { authFetch, user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await authFetch('/api/resources/request?status=PENDING');
    const data = await res.json();
    if (data.success) setRequests(data.data);
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (id: number, action: string) => {
    await authFetch('/api/approvals', {
      method: 'POST',
      body: JSON.stringify({ entityType: 'RESOURCE_REQUEST', entityId: id, action }),
    });
    await load();
  };

  return (
    <DashboardLayout title="Lab Technician" subtitle={`Approve department resource requests — ${user?.name}`}>
      <ApprovalsTable
        rows={requests.map((r) => ({
          id: r.id, entityName: r.resource.name, requesterName: r.requester.name,
          requesterRole: r.requester.role, quantity: r.quantity,
          startTime: r.startTime, endTime: r.endTime, status: r.status,
          rollNumber: r.rollNumber, reason: r.reason,
        }))}
        entityType="RESOURCE_REQUEST"
        onAction={handleAction}
        allowedActions={['APPROVE', 'REJECT']}
        loading={loading}
      />
    </DashboardLayout>
  );
}

// ─── LHC Dashboard ────────────────────────────────────────────────────────────
function LHCDashboard() {
  const { authFetch, user } = useAuth();
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useTabFromUrl('approvals');

  const load = useCallback(async () => {
    const res = await authFetch('/api/rooms/book?status=PENDING');
    const data = await res.json();
    if (data.success) setBookings(data.data);
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (id: number, action: string) => {
    await authFetch('/api/approvals', {
      method: 'POST',
      body: JSON.stringify({ entityType: 'ROOM_BOOKING', entityId: id, action }),
    });
    await load();
  };

  return (
    <DashboardLayout title="LHC Manager" subtitle={user?.name}>
      <div className="flex gap-2 mb-6">
        {(['approvals', 'calendar'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {t === 'approvals' ? 'Pending Room Bookings' : 'Manage Calendar'}
          </button>
        ))}
      </div>

      {tab === 'approvals' && (
        <ApprovalsTable
          rows={bookings.map((b) => ({
            id: b.id, entityName: b.room.name, requesterName: b.requester.name,
            requesterRole: b.requester.role, startTime: b.startTime, endTime: b.endTime,
            status: b.status, reason: b.purpose,
          }))}
          entityType="ROOM_BOOKING"
          onAction={handleAction}
          allowedActions={['APPROVE', 'REJECT']}
          loading={loading}
        />
      )}

      {tab === 'calendar' && <div className="h-[calc(100vh-12rem)]"><WeeklyCalendar canEdit /></div>}
    </DashboardLayout>
  );
}

// ─── Admin Dashboard ───────────────────────────────────────────────────────────
function AdminDashboard() {
  const { authFetch, user } = useAuth();
  const [resourceRequests, setResourceRequests] = useState<Request[]>([]);
  const [roomBookings, setRoomBookings] = useState<RoomBooking[]>([]);
  const [logs, setLogs] = useState<Array<{
    id: number; action: string; entityType: string; entityId: number;
    oldState?: string | null; newState?: string | null; createdAt: string;
    user: { name: string; role: string };
  }>>([]);
  const [tab, setTab] = useTabFromUrl('resources');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [rRes, bRes, lRes] = await Promise.all([
      authFetch('/api/resources/request'),
      authFetch('/api/rooms/book'),
      authFetch('/api/logs'),
    ]);
    const [rData, bData, lData] = await Promise.all([rRes.json(), bRes.json(), lRes.json()]);
    if (rData.success) setResourceRequests(rData.data);
    if (bData.success) setRoomBookings(bData.data);
    if (lData.success) setLogs(lData.data.logs || []);
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  const handleResourceAction = async (id: number, action: string) => {
    await authFetch('/api/approvals', {
      method: 'POST',
      body: JSON.stringify({ entityType: 'RESOURCE_REQUEST', entityId: id, action }),
    });
    await load();
  };

  const handleRoomAction = async (id: number, action: string) => {
    await authFetch('/api/approvals', {
      method: 'POST',
      body: JSON.stringify({ entityType: 'ROOM_BOOKING', entityId: id, action }),
    });
    await load();
  };

  const STATUS_STYLES: Record<string, string> = {
    PENDING: 'text-yellow-400',
    APPROVED: 'text-green-400',
    REJECTED: 'text-red-400',
    CANCELLED: 'text-zinc-400',
    WAITLISTED: 'text-blue-400',
    OVERRIDDEN: 'text-orange-400',
  };

  return (
    <DashboardLayout title="Admin Dashboard" subtitle={`Full system control — ${user?.name}`}>
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['resources', 'rooms', 'logs'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {t === 'resources' ? 'Resource Requests' : t === 'rooms' ? 'Room Bookings' : 'Logs'}
          </button>
        ))}
      </div>

      {tab === 'resources' && (
        <ApprovalsTable
          rows={resourceRequests.map((r) => ({
            id: r.id, entityName: r.resource.name, requesterName: r.requester.name,
            requesterRole: r.requester.role, quantity: r.quantity,
            startTime: r.startTime, endTime: r.endTime, status: r.status,
            rollNumber: r.rollNumber, reason: r.reason,
          }))}
          entityType="RESOURCE_REQUEST"
          onAction={handleResourceAction}
          allowedActions={['APPROVE', 'REJECT', 'CANCEL', 'OVERRIDE', 'REOPEN']}
          loading={loading}
        />
      )}

      {tab === 'rooms' && (
        <ApprovalsTable
          rows={roomBookings.map((b) => ({
            id: b.id, entityName: b.room.name, requesterName: b.requester.name,
            requesterRole: b.requester.role, startTime: b.startTime, endTime: b.endTime,
            status: b.status, reason: b.purpose,
          }))}
          entityType="ROOM_BOOKING"
          onAction={handleRoomAction}
          allowedActions={['APPROVE', 'REJECT', 'CANCEL', 'OVERRIDE', 'REOPEN']}
          loading={loading}
        />
      )}

      {tab === 'logs' && (
        <div className="overflow-x-auto">
          {loading ? <p className="text-zinc-500 text-sm">Loading…</p> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Time', 'User', 'Action', 'Entity', 'Old State', 'New State'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-zinc-500 pb-3 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-900/40">
                    <td className="py-2.5 pr-4 text-xs text-zinc-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4">
                      <p className="text-zinc-300 text-xs">{log.user.name}</p>
                      <p className="text-[10px] text-zinc-600">{log.user.role}</p>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="text-[10px] font-semibold uppercase text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">{log.action}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-zinc-400">
                      {log.entityType} #{log.entityId}
                    </td>
                    <td className="py-2.5 pr-4 text-xs">
                      {log.oldState && <span className={STATUS_STYLES[log.oldState] || 'text-zinc-500'}>{log.oldState}</span>}
                    </td>
                    <td className="py-2.5 text-xs">
                      {log.newState && <span className={STATUS_STYLES[log.newState] || 'text-zinc-500'}>{log.newState}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

// ─── Role Router ──────────────────────────────────────────────────────────────
function DashboardRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <div className="text-zinc-500 text-sm">Loading…</div>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    return null;
  }

  switch (user.role) {
    case 'STUDENT':      return <StudentDashboard />;
    case 'PROFESSOR':    return <ProfessorDashboard />;
    case 'CLUB_MANAGER': return <ClubManagerDashboard />;
    case 'LAB_TECH':     return <LabTechDashboard />;
    case 'LHC':          return <LHCDashboard />;
    case 'ADMIN':        return <AdminDashboard />;
    default:
      return (
        <DashboardLayout title="Dashboard">
          <p className="text-zinc-400">Unknown role: {user.role}</p>
        </DashboardLayout>
      );
  }
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <div className="text-zinc-500 text-sm">Loading…</div>
      </div>
    }>
      <DashboardRouter />
    </Suspense>
  );
}
