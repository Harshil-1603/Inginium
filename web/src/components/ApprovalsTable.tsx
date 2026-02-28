'use client';

import { format } from 'date-fns';

type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'WAITLISTED' | 'OVERRIDDEN';

interface ApprovalRow {
  id: number;
  entityName: string;
  requesterName: string;
  requesterRole: string;
  quantity?: number;
  startTime: string;
  endTime: string;
  status: RequestStatus;
  rollNumber?: string | null;
  reason?: string | null;
}

interface ApprovalsTableProps {
  rows: ApprovalRow[];
  entityType: 'RESOURCE_REQUEST' | 'ROOM_BOOKING';
  onAction: (id: number, action: 'APPROVE' | 'REJECT' | 'CANCEL' | 'OVERRIDE' | 'REOPEN') => Promise<void>;
  allowedActions?: Array<'APPROVE' | 'REJECT' | 'CANCEL' | 'OVERRIDE' | 'REOPEN'>;
  loading?: boolean;
}

const STATUS_STYLES: Record<RequestStatus, string> = {
  PENDING: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  APPROVED: 'bg-green-500/15 text-green-400 border-green-500/30',
  REJECTED: 'bg-red-500/15 text-red-400 border-red-500/30',
  CANCELLED: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  WAITLISTED: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  OVERRIDDEN: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
};

const ACTION_STYLES: Record<string, string> = {
  APPROVE: 'bg-[#00E599]/10 text-[#00E599] border-[#00E599]/30 hover:bg-[#00E599]/20',
  REJECT: 'bg-red-950/50 text-red-400 border-red-800/50 hover:bg-red-900/60',
  CANCEL: 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700',
  OVERRIDE: 'bg-orange-950/50 text-orange-400 border-orange-800/50 hover:bg-orange-900/60',
  REOPEN: 'bg-blue-950/50 text-blue-400 border-blue-800/50 hover:bg-blue-900/60',
};

export default function ApprovalsTable({
  rows,
  entityType,
  onAction,
  allowedActions = ['APPROVE', 'REJECT'],
  loading = false,
}: ApprovalsTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
        Loading…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600">
            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>
        <p className="text-sm text-zinc-500">No requests found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left text-xs font-semibold text-zinc-500 pb-3 pr-4">
              {entityType === 'RESOURCE_REQUEST' ? 'Resource' : 'Room'}
            </th>
            <th className="text-left text-xs font-semibold text-zinc-500 pb-3 pr-4">Requester</th>
            {entityType === 'RESOURCE_REQUEST' && (
              <th className="text-left text-xs font-semibold text-zinc-500 pb-3 pr-4">Qty</th>
            )}
            <th className="text-left text-xs font-semibold text-zinc-500 pb-3 pr-4">Period</th>
            <th className="text-left text-xs font-semibold text-zinc-500 pb-3 pr-4">Status</th>
            <th className="text-left text-xs font-semibold text-zinc-500 pb-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-zinc-900/40 transition-colors">
              <td className="py-3 pr-4">
                <p className="font-medium text-zinc-200">{row.entityName}</p>
                {row.reason && (
                  <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{row.reason}</p>
                )}
                {row.rollNumber && (
                  <p className="text-xs text-zinc-500 font-mono">{row.rollNumber}</p>
                )}
              </td>
              <td className="py-3 pr-4">
                <p className="text-zinc-300">{row.requesterName}</p>
                <p className="text-xs text-zinc-500 capitalize">{row.requesterRole.toLowerCase().replace('_', ' ')}</p>
              </td>
              {entityType === 'RESOURCE_REQUEST' && (
                <td className="py-3 pr-4 text-zinc-300">{row.quantity}</td>
              )}
              <td className="py-3 pr-4">
                <p className="text-xs text-zinc-400">
                  {format(new Date(row.startTime), 'MMM d, HH:mm')}
                </p>
                <p className="text-xs text-zinc-500">
                  → {format(new Date(row.endTime), 'MMM d, HH:mm')}
                </p>
              </td>
              <td className="py-3 pr-4">
                <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${STATUS_STYLES[row.status]}`}>
                  {row.status}
                </span>
              </td>
              <td className="py-3">
                <div className="flex gap-1.5 flex-wrap">
                  {allowedActions.map((action) => (
                    <button
                      key={action}
                      onClick={() => onAction(row.id, action)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${ACTION_STYLES[action]}`}
                    >
                      {action.charAt(0) + action.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
