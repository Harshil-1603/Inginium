export default function ProfilePage() {
    return (
        <div className="h-full p-8 bg-zinc-950">
            <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">Account</p>
                <h1 className="text-2xl font-bold text-zinc-50 tracking-tight">Profile</h1>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full flex flex-col items-center gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00E599] to-[#00b87a] flex items-center justify-center">
                    <span className="text-zinc-950 text-2xl font-bold">H</span>
                </div>
                <div className="text-center">
                    <p className="text-zinc-100 font-semibold text-base">Harshil Agrawal</p>
                    <p className="text-zinc-500 text-sm mt-0.5">harshil.agrawal098@gmail.com</p>
                </div>
                <div className="w-full border-t border-zinc-800 pt-4 flex flex-col gap-2 text-sm">
                    <div className="flex justify-between text-zinc-400">
                        <span>Plan</span>
                        <span className="text-[#00E599] font-medium">Free</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                        <span>Member since</span>
                        <span className="text-zinc-300">Feb 2026</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
