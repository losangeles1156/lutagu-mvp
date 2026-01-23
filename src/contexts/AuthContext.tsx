'use client'

import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

type AuthContextType = {
    user: User | null
    session: Session | null
    isLoading: boolean
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    isLoading: true,
})

export const useAuth = () => {
    return useContext(AuthContext)
}
