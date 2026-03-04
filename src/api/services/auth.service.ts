import apiClient from '../api-client';
import { LoginRequest, LoginResponse, User } from '@/src/types';

/**
 * Service for Authentication.
 * Handles login, logout, and session management.
 */
export class AuthService {
    static async login(request: LoginRequest): Promise<LoginResponse> {
        const email = request.email && request.email.trim() ? request.email.trim() : 'local@no-auth';
        const user: User = {
            id: 0,
            email,
            role: 'SUPER_ADMIN',
            name: 'Local User',
            active: true,
        };
        return { token: 'no-auth-token', user };
    }

    static async me(): Promise<User> {
        try {
            const response = await apiClient.get<User>('/api/auth/me');
            return response.data;
        } catch {
            return {
                id: 0,
                email: 'local@no-auth',
                role: 'SUPER_ADMIN',
                name: 'Local User',
                active: true,
            };
        }
    }

    static logout(): void {
        if (typeof window !== 'undefined') {
            window.location.href = '/bank/list';
        }
    }

    static isAuthenticated(): boolean {
        return true;
    }
}
