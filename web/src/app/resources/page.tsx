export default function ResourcesPage() {
    const resources = [
        { name: 'Getting Started Guide', type: 'Docs', updated: '2 days ago' },
        { name: 'Database Schema', type: 'Schema', updated: 'Today' },
        { name: 'API Reference', type: 'Docs', updated: '1 week ago' },
        { name: 'Design System', type: 'Design', updated: '3 days ago' },
    ];

    return (
        <div className="h-full p-8 bg-zinc-950">
            <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">Library</p>
                <h1 className="text-2xl font-bold text-zinc-50 tracking-tight">Resources</h1>
            </div>

            <div className="flex flex-col gap-2 max-w-lg">
                {resources.map((r) => (
                    <div
                        key={r.name}
                        className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 hover:border-zinc-700 transition-colors cursor-pointer group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs text-zinc-400 group-hover:bg-zinc-700 transition-colors">
                                {r.type[0]}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-50 transition-colors">{r.name}</p>
                                <p className="text-xs text-zinc-600">{r.type}</p>
                            </div>
                        </div>
                        <span className="text-xs text-zinc-600">{r.updated}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
