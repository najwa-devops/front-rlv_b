'use client';

import { createContext, useMemo, ReactNode } from 'react';
import { User } from '@/src/types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    authenticated: boolean;
    login: (email: string, password?: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const user = useMemo<User>(
        () => ({
            id: 0,
            email: 'local@no-auth',
            name: 'Local User',
            role: 'SUPER_ADMIN',
            active: true,
        }),
        []
    );

    const loading = false;
    const authenticated = true;

    const login = async (_email: string, _password?: string) => Promise.resolve();
    const logout = () => {
        if (typeof window !== 'undefined') {
            window.location.href = '/bank/list';
        }
    };
    const refreshUser = async () => Promise.resolve();

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            authenticated,
            login,
            logout,
            refreshUser
        }}>
            {children}
        </AuthContext.Provider>
    );
}
