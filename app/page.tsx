"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/bank/list")
  }, [router])

  return (
    <div className="flex w-screen h-screen">
      <div className="animate-pulse text-muted-foreground">Redirection vers la liste des relevés...</div>
    </div>
  )
}
