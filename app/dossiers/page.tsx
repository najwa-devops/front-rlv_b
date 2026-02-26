"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RedirectToBanking() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/bank/list")
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-sm text-muted-foreground">Redirection vers le module banking...</div>
    </div>
  )
}
