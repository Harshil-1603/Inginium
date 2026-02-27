export default function SettingsPage() {
    const sections = [
        {
            title: 'Appearance',
            items: [
                { label: 'Theme', value: 'Dark' },
                { label: 'Font size', value: 'Medium' },
            ],
        },
        {
            title: 'Database',
            items: [
                { label: 'Provider', value: 'Neon Postgres' },
                { label: 'Region', value: 'us-east-2' },
                { label: 'Status', value: '● Connected' },
            ],
        },
        {
            title: 'Account',
            items: [
                { label: 'Email notifications', value: 'On' },
                { label: 'Two-factor auth', value: 'Off' },
            ],
        },
    ];

    return (
        <div className="h-full p-8 bg-zinc-950">
            <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">Preferences</p>
                <h1 className="text-2xl font-bold text-zinc-50 tracking-tight">Settings</h1>
            </div>

            <div className="flex flex-col gap-4 max-w-lg">
                {sections.map((section) => (
                    <div key={section.title} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-zinc-800">
                            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{section.title}</h2>
                        </div>
                        <div className="divide-y divide-zinc-800/60">
                            {section.items.map((item) => (
                                <div key={item.label} className="flex items-center justify-between px-4 py-3">
                                    <span className="text-sm text-zinc-400">{item.label}</span>
                                    <span className={`text-sm font-medium ${item.value.includes('Connected') ? 'text-[#00E599]' : 'text-zinc-300'}`}>
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
