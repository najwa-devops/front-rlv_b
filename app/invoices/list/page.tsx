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
    if (!dateStr) return "—"
    try {
        return new Date(dateStr).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        })
    } catch {
        return "—"
    }
}

function formatAmount(val: any): string {
    if (val === null || val === undefined || val === "") return "—"
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
            toast.success(`${files.length} facture${files.length > 1 ? "s" : ""} importée${files.length > 1 ? "s" : ""}`)
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
            toast.success("Facture supprimée")
        } catch {
            toast.error("Erreur lors de la suppression")
        }
    }

    const handleProcess = async (id: number) => {
        try {
            const updated = await InvoiceService.process(id)
            setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...updated } : inv)))
            toast.success("Traitement lancé")
        } catch {
            toast.error("Erreur lors du retraitement")
        }
    }

    const handleValidate = async (id: number) => {
        try {
            const updated = await InvoiceService.validate(id)
            setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...updated } : inv)))
            toast.success("Facture validée")
        } catch {
            toast.error("Erreur lors de la validation")
        }
    }

    const handleComptabiliser = async (id: number) => {
        try {
            await InvoiceService.comptabiliser(id)
            setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, accounted: true } : inv)))
            toast.success("Facture comptabilisée")
        } catch (err: any) {
            const details = err?.response?.data?.details
            const msg = details
                ? details.join(", ")
                : (err?.response?.data?.error || "Erreur lors de la comptabilisation")
            toast.error(msg)
        }
    }

    const handleDeleteAll = async () => {
        if (!confirm("Supprimer toutes les factures ?")) return
        try {
            await InvoiceService.bulkDelete(invoices.map((inv) => inv.id))
            await loadData()
            toast.success("Toutes les factures ont été supprimées")
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
        <div className="container mx-auto py-6 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="h-11 bg-muted/50 border border-border/50 p-1">
                    <TabsTrigger
                        value="factures"
                        className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                        <FileText className="h-4 w-4" />
                        Factures
                        {counts.all > 0 && (
                            <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                                {counts.all}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger
                        value="comptabilisees"
                        className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                        <BookCheck className="h-4 w-4" />
                        Comptabilisées
                        {counts.accounted > 0 && (
                            <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                                {counts.accounted}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* ── TAB: Factures ─────────────────────────────────────── */}
                <TabsContent value="factures" className="space-y-6 mt-6">
                    <UploadInvoicePage onUpload={handleUpload} />

                    <Card className="border-border/50 bg-card/50">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-2xl">Liste des Factures</CardTitle>
                                    <CardDescription>
                                        {filteredInvoices.length} facture{filteredInvoices.length !== 1 ? "s" : ""} affichée{filteredInvoices.length !== 1 ? "s" : ""}
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleDeleteAll}
                                    disabled={invoices.length === 0}
                                >
                                    Tout supprimer
                                </Button>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Status filters */}
                    <div className="flex flex-wrap gap-2">
                        {([
                            { key: "all",       label: "Toutes",          count: counts.all },
                            { key: "pending",   label: "En attente",       count: counts.pending },
                            { key: "ready",     label: "Prêt à valider",   count: counts.ready },
                            { key: "validated", label: "Validées",         count: counts.validated },
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
                </TabsContent>

                {/* ── TAB: Comptabilisées ───────────────────────────────── */}
                <TabsContent value="comptabilisees" className="space-y-6 mt-6">
                    {accountedInvoices.length === 0 ? (
                        <Card className="border-border/50 bg-card/50">
                            <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
                                    <BookCheck className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <div className="text-center">
                                    <p className="font-medium text-foreground">Aucune facture comptabilisée</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Validez puis comptabilisez vos factures depuis l'onglet Factures
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-border/50 bg-card/50">
                            <CardHeader>
                                <CardTitle className="text-xl">Factures Comptabilisées</CardTitle>
                                <CardDescription>
                                    {accountedInvoices.length} facture{accountedInvoices.length !== 1 ? "s" : ""} comptabilisée{accountedInvoices.length !== 1 ? "s" : ""}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-border/50 hover:bg-transparent">
                                                <TableHead className="text-muted-foreground font-medium">Fichier</TableHead>
                                                <TableHead className="text-muted-foreground font-medium">Fournisseur</TableHead>
                                                <TableHead className="text-muted-foreground font-medium">N° Facture</TableHead>
                                                <TableHead className="text-muted-foreground font-medium text-right">Montant HT</TableHead>
                                                <TableHead className="text-muted-foreground font-medium text-right">Montant TVA</TableHead>
                                                <TableHead className="text-muted-foreground font-medium text-right">Montant TTC</TableHead>
                                                <TableHead className="text-muted-foreground font-medium">Comptabilisée le</TableHead>
                                                <TableHead className="text-muted-foreground font-medium">Par</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {accountedInvoices.map((invoice) => {
                                                const fd = invoice.fieldsData || {}
                                                const supplier = fd.supplier || fd.fournisseur || fd.supplierName || "—"
                                                const invoiceNumber = fd.invoiceNumber || fd.numeroFacture || fd.invoice_number || "—"
                                                const amountHT  = fd.amountHT  || fd.montantHT  || fd.totalHT  || fd.baseHT  || null
                                                const amountTVA = fd.amountTVA || fd.montantTVA || fd.tvaAmount || fd.tva    || null
                                                const amountTTC = fd.amountTTC || fd.montantTTC || fd.totalTTC || fd.total   || null
                                                return (
                                                    <TableRow
                                                        key={invoice.id}
                                                        className="border-border/50 hover:bg-accent/30 transition-colors cursor-pointer"
                                                        onClick={() => handleView(invoice)}
                                                    >
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                                                                    <BookCheck className="h-4 w-4 text-emerald-500" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="truncate max-w-[180px] text-sm font-medium text-foreground">
                                                                        {invoice.originalName || invoice.filename}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">#{invoice.id}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-sm text-foreground">{String(supplier)}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-sm text-muted-foreground font-mono">{String(invoiceNumber)}</span>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <span className="text-sm text-foreground">{formatAmount(amountHT)}</span>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <span className="text-sm text-muted-foreground">{formatAmount(amountTVA)}</span>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <span className="text-sm font-semibold text-foreground">{formatAmount(amountTTC)}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-sm text-muted-foreground">{formatDate(invoice.accountedAt)}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-sm text-muted-foreground">{invoice.accountedBy || "—"}</span>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
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
