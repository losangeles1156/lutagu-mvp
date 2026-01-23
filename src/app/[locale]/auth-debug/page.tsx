'use client'

import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/utils/supabase/client'
import { useState } from 'react'

export default function AuthDebugPage() {
    const { user, session, isLoading } = useAuth()
    const [message, setMessage] = useState('')
    const supabase = createClient()

    const handleLogin = async () => {
        if (!supabase) {
            setMessage('Supabase 尚未設定')
            return
        }

        setMessage('Logging in...')
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=/auth-debug`
            }
        })
        if (error) setMessage(error.message)
    }

    const handleLogout = async () => {
        if (!supabase) {
            setMessage('Supabase 尚未設定')
            return
        }

        await supabase.auth.signOut()
        setMessage('Signed out')
    }

    return (
        <div className="p-8 space-y-4">
            <h1 className="text-2xl font-bold">Auth Debug</h1>
            <div>
                <strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}
            </div>
            <div>
                <strong>User:</strong> {user ? user.email : 'None'}
            </div>
            <div>
                <strong>Session ID:</strong> {session ? 'Present' : 'Missing'}
            </div>

            <div className="space-x-4">
                <button
                    onClick={handleLogin}
                    className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                    Login with Google
                </button>
                <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-500 text-white rounded"
                >
                    Logout
                </button>
            </div>
            {message && <div className="mt-4 text-sm text-gray-500">{message}</div>}

            <pre className="mt-4 bg-gray-100 p-4 rounded overflow-auto max-w-xl text-xs">
                {JSON.stringify({ user, session }, null, 2)}
            </pre>
        </div>
    )
}
