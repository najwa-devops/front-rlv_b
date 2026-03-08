"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/invoices/list")
  }, [router])

  return (
    <div className="flex w-screen h-screen">
      <div className="animate-pulse text-muted-foreground">Redirection vers la liste des factures...</div>
    </div>
  )
}
