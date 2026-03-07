"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, FileText, BookCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UploadInvoicePage } from "@/components/upload-invoice-page"
import { InvoiceTable } from "@/components/invoice-table"
import { InvoiceService } from "@/src/api/services/invoice.service"
import { InvoiceDto } from "@/src/types"
import { toast } from "sonner"

type StatusFilter = "all" | "pending" | "ready" | "validated" | "error"

function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return "â€”"
    try {
        return new Date(dateStr).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        })
    } catch {
        return "â€”"
    }
}

function formatAmount(val: any): string {
    if (val === null || val === undefined || val === "") return "â€”"
    const n = Number(val)
    if (isNaN(n)) return String(val)
    return n.toLocaleString("fr-FR", { minimumFractionDigits: 2 })
}

function InvoiceListPageContent() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [invoices, setInvoices] = useState<InvoiceDto[]>([])
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
    const [activeTab, setActiveTab] = useState("factures")

    const loadData = async () => {
        try {
            const data = await InvoiceService.getAll()
            setInvoices(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error("Error loading invoices:", error)
            toast.error("Impossible de charger les factures")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        const hasProcessing = invoices.some((inv) =>
            ["PENDING", "PROCESSING"].includes((inv.status || "").toUpperCase())
        )
        if (!hasProcessing) return
        const interval = setInterval(loadData, 3000)
        return () => clearInterval(interval)
    }, [invoices])

    const filteredInvoices = invoices.filter((inv) => {
        const s = (inv.status || "").toUpperCase()
        switch (statusFilter) {
            case "pending":   return ["PENDING", "PROCESSING"].includes(s)
            case "ready":     return s === "READY_TO_VALIDATE"
            case "validated": return s === "VALIDATED"
            case "error":     return ["ERROR", "REJECTED", "TO_VERIFY", "VERIFY"].includes(s)
            default:          return true
        }
    })

    const accountedInvoices = invoices.filter((inv) => inv.accounted)

    const handleUpload = async (files: File[]) => {
        try {
            if (files.length === 1) {
                await InvoiceService.upload(files[0])
            } else {
                await InvoiceService.uploadBatch(files)
            }
            toast.success(`${files.length} facture${files.length > 1 ? "s" : ""} importÃ©e${files.length > 1 ? "s" : ""}`)
            await loadData()
        } catch {
            toast.error("Erreur lors de l'import")
        }
    }

    const handleView = (invoice: InvoiceDto) => {
        router.push(`/invoices/${invoice.id}`)
    }

    const handleDelete = async (id: number) => {
        try {
            await InvoiceService.delete(id)
            setInvoices((prev) => prev.filter((inv) => inv.id !== id))
            toast.success("Facture supprimÃ©e")
        } catch {
            toast.error("Erreur lors de la suppression")
        }
    }

    const handleProcess = async (id: number) => {
        try {
            const updated = await InvoiceService.process(id)
            setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...updated } : inv)))
            toast.success("Traitement lancÃ©")
        } catch {
            toast.error("Erreur lors du retraitement")
        }
    }

    const handleValidate = async (id: number) => {
        try {
            const updated = await InvoiceService.validate(id)
            setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...updated } : inv)))
            toast.success("Facture validÃ©e")
        } catch {
            toast.error("Erreur lors de la validation")
        }
    }

    const handleComptabiliser = async (id: number) => {
        try {
            await InvoiceService.comptabiliser(id)
            setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, accounted: true } : inv)))
            toast.success("Facture comptabilisÃ©e")
        } catch (err: any) {
            const details = err?.details?.details || err?.details
            const apiError = err?.details?.error || err?.details?.message || err?.message
            const msg = details
                ? (Array.isArray(details) ? details.join(", ") : String(details))
                : (apiError || "Erreur lors de la comptabilisation")
            toast.error(msg)
        }
    }

    const handleDeleteAll = async () => {
        if (!confirm("Supprimer toutes les factures ?")) return
        try {
            await InvoiceService.bulkDelete(invoices.map((inv) => inv.id))
            await loadData()
            toast.success("Toutes les factures ont Ã©tÃ© supprimÃ©es")
        } catch {
            toast.error("Erreur lors de la suppression globale")
        }
    }

    const counts = {
        all:       invoices.length,
        pending:   invoices.filter((i) => ["PENDING", "PROCESSING"].includes((i.status || "").toUpperCase())).length,
        ready:     invoices.filter((i) => (i.status || "").toUpperCase() === "READY_TO_VALIDATE").length,
        validated: invoices.filter((i) => (i.status || "").toUpperCase() === "VALIDATED").length,
        error:     invoices.filter((i) => ["ERROR", "REJECTED", "TO_VERIFY", "VERIFY"].includes((i.status || "").toUpperCase())).length,
        accounted: accountedInvoices.length,
    }

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="container mx-auto py-0 space-y-3">
               

                    <UploadInvoicePage onUpload={handleUpload} />


                    {/* Status filters */}
                    <div className="flex flex-wrap gap-2">
                        {([
                            { key: "all",       label: "Toutes",          count: counts.all },
                            { key: "pending",   label: "En attente",       count: counts.pending },
                            { key: "ready",     label: "PrÃªt Ã  valider",   count: counts.ready },
                            { key: "validated", label: "ValidÃ©es",         count: counts.validated },
                            { key: "error",     label: "Erreurs",          count: counts.error },
                        ] as const).map(({ key, label, count }) => (
                            <Button
                                key={key}
                                variant={statusFilter === key ? "default" : "outline"}
                                size="sm"
                                onClick={() => setStatusFilter(key)}
                                className="gap-2"
                            >
                                {label}
                                {count > 0 && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                        statusFilter === key
                                            ? "bg-white/20 text-white"
                                            : "bg-muted text-muted-foreground"
                                    }`}>
                                        {count}
                                    </span>
                                )}
                            </Button>
                        ))}
                    </div>

                    <InvoiceTable
                        invoices={filteredInvoices}
                        onView={handleView}
                        onDelete={handleDelete}
                        onProcess={handleProcess}
                        onValidate={handleValidate}
                        onComptabiliser={handleComptabiliser}
                    />

                
        </div>
    )
}

export default function InvoiceListPage() {
    return (
        <Suspense
            fallback={
                <div className="flex h-96 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            }
        >
            <InvoiceListPageContent />
        </Suspense>
    )
}

