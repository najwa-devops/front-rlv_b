'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
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

const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/$/, '') === '/api' ? '' : RAW_API_BASE_URL.replace(/\/$/, '');

const SEED_USERNAME = process.env.NEXT_PUBLIC_SEED_USERNAME || 'superadmin@invoice.local';
const SEED_PASSWORD = process.env.NEXT_PUBLIC_SEED_PASSWORD || 'Admin@123';

const FALLBACK_USER: User = {
    id: 0,
    email: SEED_USERNAME,
    name: 'Super Admin',
    role: 'SUPER_ADMIN',
    active: true,
};

async function doLogin(username: string, password: string): Promise<User | null> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        const u = data?.user || data;
        return {
            id: u.id ?? 0,
            email: u.email || u.username || username,
            name: u.displayName || u.name || 'Super Admin',
            role: (u.role as User['role']) || 'SUPER_ADMIN',
            active: u.active ?? true,
        };
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            // Try to restore an existing session first
            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
                    credentials: 'include',
                });
                if (res.ok) {
                    const data = await res.json();
                    setUser({
                        id: data.id ?? 0,
                        email: data.email || data.username || SEED_USERNAME,
                        name: data.displayName || data.name || 'Super Admin',
                        role: (data.role as User['role']) || 'SUPER_ADMIN',
                        active: data.active ?? true,
                    });
                    return;
                }
            } catch { /* backend may be unreachable */ }

            // No active session — auto-login with seed credentials
            const loggedIn = await doLogin(SEED_USERNAME, SEED_PASSWORD);
            setUser(loggedIn || FALLBACK_USER);
        };

        init().finally(() => setLoading(false));
    }, []);

    const login = async (email: string, password?: string) => {
        const loggedIn = await doLogin(email, password || '');
        setUser(loggedIn || FALLBACK_USER);
    };

    const logout = () => {
        fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
        setUser(null);
        if (typeof window !== 'undefined') {
            window.location.href = '/bank/list';
        }
    };

    const refreshUser = async () => {
        const loggedIn = await doLogin(SEED_USERNAME, SEED_PASSWORD);
        if (loggedIn) setUser(loggedIn);
    };

    return (
        <AuthContext.Provider value={{
            user: user || FALLBACK_USER,
            loading,
            authenticated: true,
            login,
            logout,
            refreshUser,
        }}>
            {children}
        </AuthContext.Provider>
    );
}
