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

    if (isLoginPage) {
        return <>{children}</>
    }

    return (
        <div className="flex flex-col h-screen bg-background text-foreground">
            {/* Top navigation bar */}
            <header className="h-12 sm:h-14 border-b border-border/50 bg-card/30 backdrop-blur-md flex items-center justify-between px-3 sm:px-6 shrink-0">
                <div className="flex items-center gap-2 sm:gap-3">
                    
                    <span className="font-bold text-sm sm:text-base text-foreground tracking-tight">Evoleo Scan</span>
                    <div className="flex items-center gap-1 sm:gap-2 ml-2 sm:ml-3 pl-2 sm:pl-3 border-l border-border/50">
                    <Link
                            href="/invoices/list"
                            className={`text-[10px] sm:text-xs px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                                pathname.startsWith("/invoices")
                                    ? "bg-primary/15 text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                            }`}
                        >
                            Facture
                        </Link>
                        <Link
                            href="/bank/list"
                            className={`text-[10px] sm:text-xs px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                                pathname.startsWith("/bank")
                                    ? "bg-primary/15 text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                            }`}
                        >
                            Relevés Bancaires
                        </Link>
                        
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    {user && (
                        <div className="flex items-center gap-2 sm:gap-3 border-r border-border/50 pr-2 sm:pr-3 mr-1">
                          
                            <div className="text-right hidden sm:block">
                                <p className="text-xs sm:text-sm font-semibold text-foreground leading-none">{displayName}</p>
                            </div>
                        </div>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
                        onClick={toggleTheme}
                    >
                        {mounted && theme === "dark" ? <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                    </Button>

                   
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                <div className="w-full px-2 sm:px-4 py-2 sm:py-4">
                    <div className="mb-3 sm:mb-4">
                        <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-foreground">
                            {pageTitle}
                        </h1>
                    </div>

                    {children}
                </div>
            </main>
        </div>
    )
}
