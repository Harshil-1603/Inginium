'use client';

interface ResourceCardProps {
  id: number;
  name: string;
  description?: string | null;
  quantity: number;
  ownerName: string;
  ownerType: 'CLUB' | 'DEPARTMENT';
  onRequest?: (id: number, name: string) => void;
  onDelete?: (id: number) => void;
}

const OWNER_TYPE_COLORS = {
  DEPARTMENT: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  CLUB: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
};

export default function ResourceCard({
  id,
  name,
  description,
  quantity,
  ownerName,
  ownerType,
  onRequest,
  onDelete,
}: ResourceCardProps) {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100 truncate">{name}</h3>
          {description && (
            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{description}</p>
          )}
        </div>
        <span
          className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${OWNER_TYPE_COLORS[ownerType]}`}
        >
          {ownerType === 'DEPARTMENT' ? 'Dept' : 'Club'}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500">{ownerName}</p>
          <p className="text-sm font-semibold text-[#00E599] mt-0.5">
            {quantity} available
          </p>
        </div>

        <div className="flex gap-2">
          {onDelete && (
            <button
              onClick={() => onDelete(id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-950/50 text-red-400 border border-red-800/50 hover:bg-red-900/60 transition-colors"
            >
              Remove
            </button>
          )}
          {onRequest && (
            <button
              onClick={() => onRequest(id, name)}
              disabled={quantity <= 0}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#00E599]/10 text-[#00E599] border border-[#00E599]/30 hover:bg-[#00E599]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Request
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
