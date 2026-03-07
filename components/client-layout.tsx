"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { getRouteMetadata } from "@/src/config/navigation.config"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { Sun, Moon, LogOut, Sparkles } from "lucide-react"

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false)
    const pathname = usePathname()
    const { user, logout } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const isLoginPage = pathname === "/login"

    const displayName = (user?.name && user.name.trim()) || (user?.email ? user.email.split("@")[0] : "Utilisateur")
    const userInitial = displayName.charAt(0).toUpperCase() || "U"

    useEffect(() => { setMounted(true) }, [])

    const { title: pageTitle } = getRouteMetadata(pathname)
    const bankingMenu = [
        { href: "/bank/list", label: "Liste des relevés" },
        { href: "/centre-monetique", label: "Centre Monétique" },
    ]

    if (isLoginPage) {
        return <>{children}</>
    }

    return (
        <div className="flex flex-col h-screen bg-background text-foreground">
            {/* Top navigation bar */}
            <header className="h-14 border-b border-border/50 bg-card/30 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                        <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-bold text-foreground tracking-tight">BankingOCR</span>
                    <span className="text-xs text-muted-foreground hidden sm:block">— Relevés Bancaires</span>
                </div>

                <div className="flex items-center gap-3">
                    {user && (
                        <div className="flex items-center gap-3 border-r border-border/50 pr-3 mr-1">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                                {userInitial}
                            </div>
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-foreground leading-none">{displayName}</p>
                                <p className="text-[10px] text-muted-foreground uppercase mt-0.5 tracking-wider font-bold">{user.role}</p>
                            </div>
                        </div>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={toggleTheme}
                    >
                        {mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={logout}
                    >
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                <div className="container mx-auto px-6 py-6">
                    <nav className="mb-4 flex flex-wrap gap-2">
                        {bankingMenu.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                                        isActive
                                            ? "border-primary/40 bg-primary/10 text-primary"
                                            : "border-border/60 bg-card/40 text-muted-foreground hover:bg-accent hover:text-foreground"
                                    }`}
                                >
                                    {item.label}
                                </Link>
                            )
                        })}
                    </nav>

                    <div className="mb-8">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            {pageTitle}
                        </h1>
                    </div>

                    {children}
                </div>
            </main>
        </div>
    )
}
