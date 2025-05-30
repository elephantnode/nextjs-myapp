// components/UserContext.tsx
'use client'

import React, { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'

const UserContext = createContext<User | null>(null)

export const UserProvider = ({ user, children }: { user: User; children: React.ReactNode }) => {
    return <UserContext.Provider value={user}>{children}</UserContext.Provider>
}

export const useUser = () => useContext(UserContext)