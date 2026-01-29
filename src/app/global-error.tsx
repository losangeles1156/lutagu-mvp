
'use client';

import { useEffect } from 'react';


export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[GlobalError] Unhandled error:', error);
    }, [error]);

    return (
        <html>
            <body className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 p-4 font-sans text-neutral-900">
                <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-2xl shadow-xl">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight text-red-600">
                            Critical System Error
                        </h2>
                        <p className="text-neutral-500">
                            LUTAGU has encountered a fatal error. Our team has been notified.
                        </p>
                        {error.digest && (
                            <div className="text-xs font-mono text-neutral-400 bg-neutral-100 p-2 rounded">
                                Error ID: {error.digest}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => reset()}
                            className="bg-neutral-900 text-white hover:bg-neutral-800 px-4 py-2 rounded-md font-medium transition-colors"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
