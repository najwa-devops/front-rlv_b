"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Building2, FileText } from "lucide-react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import { Card, CardDescription, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { BankStatementTable } from "@/components/bank-statement-table"
import { UploadBankPage } from "@/components/upload-bank-page"
import { UploadInvoicePage } from "@/components/upload-invoice-page"
import { InvoiceTable } from "@/components/invoice-table"
import { api } from "@/lib/api"
import { BankStatementV2 } from "@/lib/types"
import { InvoiceService } from "@/src/api/services/invoice.service"
import { InvoiceDto } from "@/src/types"
import { toast } from "sonner"

function BankListPageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [loading, setLoading] = useState(true)
    const [statements, setStatements] = useState<BankStatementV2[]>([])
    const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "validated" | "accounted">("all")
    const [deleteAllOpen, setDeleteAllOpen] = useState(false)

    const isAccountedStatus = (status?: string) => {
        const normalized = (status || "").toUpperCase()
        return normalized === "COMPTABILISE" || normalized === "COMPTABILISÉ"
    }

    // Invoice tab state
    const [invoicesLoading, setInvoicesLoading] = useState(false)
    const [invoicesFetched, setInvoicesFetched] = useState(false)
    const [invoices, setInvoices] = useState<InvoiceDto[]>([])
    const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<"all" | "pending" | "ready" | "validated" | "error">("all")

    const loadData = async () => {
        try {
            const statementsData = await api.getAllBankStatements({ limit: 1000 })
            setStatements(Array.isArray(statementsData) ? statementsData : [])
        } catch (error) {
            console.error("Error loading bank statements:", error)
            toast.error("Impossible de charger les relevés bancaires")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const resetTemporaryStatementsOnRefresh = async () => {
            setLoading(true)
            try {
                const existing = await api.getAllBankStatements({ limit: 1000 })
                const temporary = (Array.isArray(existing) ? existing : []).filter((s) => !isAccountedStatus(s.status))
                if (temporary.length > 0) {
                    await Promise.allSettled(temporary.map((s) => api.deleteBankStatement(s.id)))
                }
            } catch (error) {
                console.error("Error clearing temporary bank statements on refresh:", error)
            } finally {
                await loadData()
            }
        }

        resetTemporaryStatementsOnRefresh()
    }, [])

    useEffect(() => {
        const q = (searchParams.get("filter") || "").toLowerCase()
        if (q === "pending" || q === "validated" || q === "accounted") {
            setStatusFilter(q)
        } else {
            setStatusFilter("all")
        }
    }, [searchParams])

    useEffect(() => {
        const hasProcessing = statements.some((s) =>
            ["PENDING", "PROCESSING", "EN_ATTENTE", "EN_COURS"].includes(s.status)
        )
        if (!hasProcessing) return

        const interval = setInterval(() => {
            loadData()
        }, 2000)
        return () => clearInterval(interval)
    }, [statements])

    const filteredStatements = statements.filter((s) => {
        const status = (s.status || "").toUpperCase()
        const isValidated = status === "VALIDATED" || status === "VALIDE"
        const isAccounted = isAccountedStatus(status)
        const isPending = !isValidated && !isAccounted

        if (statusFilter === "validated") return isValidated
        if (statusFilter === "accounted") return isAccounted
        if (statusFilter === "pending") return isPending
        return true
    })

    const handleUpload = async (files: File[], bankType?: string) => {
        const effectiveBankType = bankType || "AUTO"
        const allowedBanks: string[] = []

        for (const file of files) {
            await api.uploadBankStatement(file, effectiveBankType, allowedBanks)
        }
        toast.success("Import terminé")
        await loadData()
    }

    const handleView = (statement: BankStatementV2) => {
        router.push(`/bank/ocr/${statement.id}`)
    }

    const handleDelete = async (id: number) => {
        try {
            await api.deleteBankStatement(id)
            setStatements((prev) => prev.filter((s) => s.id !== id))
            toast.success("Relevé supprimé")
        } catch (error) {
            toast.error("Erreur lors de la suppression")
        }
    }

    const handleValidate = async (id: number) => {
        try {
            await api.validateBankStatement(id)
            await loadData()
            toast.success("Relevé validé")
        } catch (error) {
            toast.error("Erreur lors de la validation")
        }
    }

    const handleMarkAsAccounted = async (id: number) => {
        const previous = statements

        // Mise à jour instantanée UI sans refresh
        setStatements((prev) =>
            prev.map((s) =>
                s.id === id
                    ? { ...s, status: "COMPTABILISE", statusCode: "COMPTABILISE", canReprocess: false }
                    : s
            )
        )

        try {
            const updated = await api.updateBankStatementStatus(id, "COMPTABILISE")
            setStatements((prev) =>
                prev.map((s) => (s.id === id ? { ...s, ...updated } : s))
            )
            toast.success("Relevé comptabilisé")
        } catch (error) {
            setStatements(previous)
            toast.error("Erreur lors de la comptabilisation")
        }
    }

    const handleReprocess = async (statement: BankStatementV2) => {
        try {
            // Reflect the action immediately in UI while backend starts processing.
            setStatements((prev) =>
                prev.map((s) =>
                    s.id === statement.id
                        ? { ...s, status: "PROCESSING", canReprocess: false }
                        : s
                )
            )

            const allowedBanks: string[] = []

            const updatedStatement = await api.processBankStatement(statement.id, allowedBanks)
            setStatements((prev) =>
                prev.map((s) => (s.id === statement.id ? { ...s, ...updatedStatement } : s))
            )
            toast.success("Reprocessage lancé")

            // Force short polling on the single statement to keep UI in sync immediately.
            const maxAttempts = 8
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                await new Promise((resolve) => setTimeout(resolve, 1200))
                const latest = await api.getBankStatementById(statement.id)
                setStatements((prev) =>
                    prev.map((s) => (s.id === statement.id ? { ...s, ...latest } : s))
                )
                const isStillProcessing = ["PENDING", "PROCESSING", "EN_ATTENTE", "EN_COURS"].includes(latest.status)
                if (!isStillProcessing) {
                    break
                }
            }
            await loadData()
        } catch (error) {
            toast.error("Erreur lors du reprocessage")
            await loadData()
        }
    }

    const handleDeleteAll = () => {
        setDeleteAllOpen(true)
    }

    const confirmDeleteAll = async () => {
        try {
            await api.deleteAllBankStatements()
            await loadData()
            toast.success("Tous les relevés ont été supprimés")
        } catch (error) {
            toast.error("Erreur lors de la suppression globale")
        } finally {
            setDeleteAllOpen(false)
        }
    }

    // ── Invoice tab handlers ──────────────────────────────────────────────────

    const loadInvoices = async () => {
        setInvoicesLoading(true)
        try {
            const data = await InvoiceService.getAll()
            setInvoices(Array.isArray(data) ? data : [])
            setInvoicesFetched(true)
        } catch {
            toast.error("Impossible de charger les factures")
        } finally {
            setInvoicesLoading(false)
        }
    }

    const handleTabChange = (value: string) => {
        if (value === "invoices" && !invoicesFetched) {
            loadInvoices()
        }
    }

    const handleInvoiceUpload = async (files: File[]) => {
        try {
            if (files.length === 1) {
                await InvoiceService.upload(files[0])
            } else {
                await InvoiceService.uploadBatch(files)
            }
            toast.success(`${files.length} facture${files.length > 1 ? "s" : ""} importée${files.length > 1 ? "s" : ""}`)
            await loadInvoices()
        } catch {
            toast.error("Erreur lors de l'import")
            throw new Error("upload failed")
        }
    }

    const handleInvoiceView = (invoice: InvoiceDto) => {
        router.push(`/invoices/${invoice.id}`)
    }

    const handleInvoiceDelete = async (id: number) => {
        try {
            await InvoiceService.delete(id)
            setInvoices((prev) => prev.filter((inv) => inv.id !== id))
            toast.success("Facture supprimée")
        } catch {
            toast.error("Erreur lors de la suppression")
        }
    }

    const handleInvoiceProcess = async (id: number) => {
        try {
            const updated = await InvoiceService.process(id)
            setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...updated } : inv)))
            toast.success("Retraitement lancé")
        } catch {
            toast.error("Erreur lors du retraitement")
        }
    }

    const handleInvoiceValidate = async (id: number) => {
        try {
            const updated = await InvoiceService.validate(id)
            setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...updated } : inv)))
            toast.success("Facture validée")
        } catch {
            toast.error("Erreur lors de la validation")
        }
    }

    const handleInvoiceComptabiliser = async (id: number) => {
        try {
            await InvoiceService.comptabiliser(id)
            setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, accounted: true } : inv)))
            toast.success("Facture comptabilisée")
        } catch (err: any) {
            const details = err?.response?.data?.details
            const msg = details ? details.join(", ") : (err?.response?.data?.error || "Erreur lors de la comptabilisation")
            toast.error(msg)
        }
    }

    const handleInvoiceDeleteAll = async () => {
        if (!confirm("Supprimer toutes les factures ?")) return
        try {
            await InvoiceService.bulkDelete(invoices.map((i) => i.id))
            setInvoices([])
            toast.success("Toutes les factures ont été supprimées")
        } catch {
            toast.error("Erreur lors de la suppression globale")
        }
    }

    const filteredInvoices = invoices.filter((inv) => {
        const s = (inv.status || "").toUpperCase()
        switch (invoiceStatusFilter) {
            case "pending":    return ["PENDING", "PROCESSING"].includes(s)
            case "ready":      return s === "READY_TO_VALIDATE"
            case "validated":  return s === "VALIDATED"
            case "error":      return ["ERROR", "REJECTED", "TO_VERIFY", "VERIFY"].includes(s)
            default:           return true
        }
    })

    const invoiceCounts = {
        all:       invoices.length,
        pending:   invoices.filter((i) => ["PENDING", "PROCESSING"].includes((i.status || "").toUpperCase())).length,
        ready:     invoices.filter((i) => (i.status || "").toUpperCase() === "READY_TO_VALIDATE").length,
        validated: invoices.filter((i) => (i.status || "").toUpperCase() === "VALIDATED").length,
        error:     invoices.filter((i) => ["ERROR", "REJECTED", "TO_VERIFY", "VERIFY"].includes((i.status || "").toUpperCase())).length,
    }

    if (loading) {
        return (
            <div className="flex h-48 sm:h-96 items-center justify-center">
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="mx-auto space-y-3 w-full">


                {/* ── Bank tab ── */}
                    <UploadBankPage onUpload={handleUpload} onViewBankStatement={() => {}} />





                    <BankStatementTable
                        statements={filteredStatements}
                        onView={handleView}
                        onDelete={handleDelete}
                        onValidate={handleValidate}
                        onMarkAsAccounted={handleMarkAsAccounted}
                        onReprocess={handleReprocess}
                        onUpdateStatement={(updated) => {
                            setStatements((prev) =>
                                prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
                            )
                        }}
                    />


        <div className="container mx-auto py-6 space-y-6">
            <UploadBankPage onUpload={handleUpload} onViewBankStatement={() => {}} />

            <Card className="border-border/50 bg-card/50">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardDescription>
                            {filteredStatements.length} relevé{filteredStatements.length > 1 ? "s" : ""} affiché{filteredStatements.length > 1 ? "s" : ""}
                        </CardDescription>
                        <Button variant="destructive" size="sm" onClick={handleDeleteAll} disabled={statements.length === 0}>
                            Tout supprimer
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <div className="flex flex-wrap gap-2">
                <Button variant={statusFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("all")}>
                    Tous
                </Button>
                <Button variant={statusFilter === "pending" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("pending")}>
                    À traiter
                </Button>
                <Button variant={statusFilter === "validated" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("validated")}>
                    Validés
                </Button>
                <Button variant={statusFilter === "accounted" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("accounted")}>
                    Comptabilisés
                </Button>
            </div>

            <BankStatementTable
                statements={filteredStatements}
                onView={handleView}
                onDelete={handleDelete}
                onValidate={handleValidate}
                onMarkAsAccounted={handleMarkAsAccounted}
                onReprocess={handleReprocess}
                onUpdateStatement={(updated) => {
                    setStatements((prev) =>
                        prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
                    )
                }}
            />

            <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmation</AlertDialogTitle>
                        <AlertDialogDescription>
                            Êtes-vous sûr de supprimer ces fichiers ?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); void confirmDeleteAll() }}>
                            Oui
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}


export default function BankListPage() {
    return (
        <Suspense fallback={<div className="flex h-48 sm:h-96 items-center justify-center"><Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" /></div>}>
            <BankListPageContent />
        </Suspense>
    )
}
