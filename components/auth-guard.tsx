"use client"

import { UserRole } from "@/src/types"

interface AuthGuardProps {
    children: React.ReactNode
    /** Kept for compatibility; auth checks are disabled. */
    allowedRoles?: UserRole[]
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
    void allowedRoles
    return <>{children}</>
}
