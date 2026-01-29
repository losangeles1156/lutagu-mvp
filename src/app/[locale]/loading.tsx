
export default function Loading() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-md">
            <div className="flex flex-col items-center gap-4 animate-pulse">
                <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 via-indigo-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200">
                    <span className="text-3xl text-white">✨</span>
                </div>
                <div className="h-4 w-32 bg-gray-200 rounded-full" />
            </div>
        </div>
    );
}
