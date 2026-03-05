"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    FileText,
    Trash2,
    Eye,
    Loader2,
    MoreHorizontal,
    CheckCircle2,
    RefreshCw,
    Search,
    BookCheck,
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { InvoiceDto } from "@/src/types"

interface InvoiceTableProps {
    invoices: InvoiceDto[]
    onView: (invoice: InvoiceDto) => void
    onDelete: (id: number) => void
    onProcess?: (id: number) => void
    onValidate?: (id: number) => void
    onComptabiliser?: (id: number) => void
}

function getStatusBadge(status: string | undefined) {
    switch ((status || "").toUpperCase()) {
        case "PENDING":
            return <Badge className="bg-sky-400/10 text-sky-500 border-sky-400/30">En attente</Badge>
        case "PROCESSING":
            return <Badge className="bg-blue-500/10 text-blue-600 border-blue-400/30 animate-pulse">En cours</Badge>
        case "TREATED":
            return <Badge className="bg-blue-700/10 text-blue-800 border-blue-700/30">Traité</Badge>
        case "READY_TO_VALIDATE":
            return <Badge className="bg-emerald-400/10 text-emerald-500 border-emerald-400/30">Prêt à valider</Badge>
        case "VALIDATED":
            return <Badge className="bg-emerald-600 text-white border-emerald-700">Validé</Badge>
        case "REJECTED":
            return <Badge className="bg-destructive text-white border-destructive">Rejeté</Badge>
        case "ERROR":
            return <Badge className="bg-destructive/10 text-destructive border-destructive/30">Erreur</Badge>
        case "TO_VERIFY":
        case "VERIFY":
            return <Badge className="bg-orange-400/10 text-orange-500 border-orange-400/30">À vérifier</Badge>
        default:
            return <Badge variant="outline" className="text-muted-foreground border-muted">{status || "—"}</Badge>
    }
}


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

export function InvoiceTable({ invoices, onView, onDelete, onProcess, onValidate, onComptabiliser }: InvoiceTableProps) {
    const [search, setSearch] = useState("")
    const [processingIds, setProcessingIds] = useState<Set<number>>(new Set())
    const [validatingIds, setValidatingIds] = useState<Set<number>>(new Set())
    const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set())
    const [comptabilisantIds, setComptabilisantIds] = useState<Set<number>>(new Set())

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        if (!q) return invoices
        return invoices.filter((inv) => {
            const name = (inv.originalName || inv.filename || "").toLowerCase()
            const supplier = String(inv.fieldsData?.supplier || inv.fieldsData?.fournisseur || "").toLowerCase()
            const number = String(inv.fieldsData?.invoiceNumber || inv.fieldsData?.numeroFacture || "").toLowerCase()
            const template = (inv.templateName || "").toLowerCase()
            return name.includes(q) || supplier.includes(q) || number.includes(q) || template.includes(q)
        })
    }, [invoices, search])

    const handleProcess = async (id: number) => {
        if (!onProcess) return
        setProcessingIds(prev => new Set(prev).add(id))
        try { await onProcess(id) } finally {
            setProcessingIds(prev => { const s = new Set(prev); s.delete(id); return s })
        }
    }

    const handleValidate = async (id: number) => {
        if (!onValidate) return
        setValidatingIds(prev => new Set(prev).add(id))
        try { await onValidate(id) } finally {
            setValidatingIds(prev => { const s = new Set(prev); s.delete(id); return s })
        }
    }

    const handleDelete = async (id: number) => {
        setDeletingIds(prev => new Set(prev).add(id))
        try { await onDelete(id) } finally {
            setDeletingIds(prev => { const s = new Set(prev); s.delete(id); return s })
        }
    }

    const handleComptabiliser = async (id: number) => {
        if (!onComptabiliser) return
        setComptabilisantIds(prev => new Set(prev).add(id))
        try { await onComptabiliser(id) } finally {
            setComptabilisantIds(prev => { const s = new Set(prev); s.delete(id); return s })
        }
    }

    if (invoices.length === 0) {
        return (
            <Card className="border-border/50 bg-card/50">
                <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                        <p className="font-medium text-foreground">Aucune facture</p>
                        <p className="text-sm text-muted-foreground mt-1">Uploadez des factures pour commencer</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-border/50 bg-card/50">
            <CardHeader>
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-xl">Liste des Factures</CardTitle>
                        <CardDescription>
                            {filtered.length} facture{filtered.length > 1 ? "s" : ""} affichée{filtered.length > 1 ? "s" : ""}
                        </CardDescription>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-background border-border/50"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border/50 hover:bg-transparent">
                                <TableHead className="text-muted-foreground font-medium">Fichier</TableHead>
                                <TableHead className="text-muted-foreground font-medium">Fournisseur</TableHead>
                                <TableHead className="text-muted-foreground font-medium">Date Facture</TableHead>
                                <TableHead className="text-muted-foreground font-medium">N° Facture</TableHead>
                                <TableHead className="text-muted-foreground font-medium text-right">Montant HT</TableHead>
                                <TableHead className="text-muted-foreground font-medium text-right">Montant TVA</TableHead>
                                <TableHead className="text-muted-foreground font-medium text-right">Montant TTC</TableHead>
                                <TableHead className="text-muted-foreground font-medium">Statut</TableHead>
                                <TableHead className="text-muted-foreground font-medium text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((invoice) => {
                                const isProcessing = processingIds.has(invoice.id)
                                const isValidating = validatingIds.has(invoice.id)
                                const isDeleting = deletingIds.has(invoice.id)
                                const isComptabilisant = comptabilisantIds.has(invoice.id)
                                const statusUp = (invoice.status || "").toUpperCase()
                                const canProcess = !["VALIDATED", "REJECTED"].includes(statusUp)
                                const canValidate = statusUp === "READY_TO_VALIDATE" || invoice.canValidate
                                const canComptabiliser = statusUp === "VALIDATED" && !invoice.accounted

                                const supplier =
                                    invoice.fieldsData?.supplier ||
                                    invoice.fieldsData?.fournisseur ||
                                    invoice.fieldsData?.supplierName ||
                                    "—"
                                const invoiceNumber =
                                    invoice.fieldsData?.invoiceNumber ||
                                    invoice.fieldsData?.numeroFacture ||
                                    invoice.fieldsData?.invoice_number ||
                                    "—"
                                const invoiceDate =
                                    invoice.fieldsData?.invoiceDate ||
                                    invoice.fieldsData?.dateFacture ||
                                    invoice.fieldsData?.date ||
                                    null
                                const amountHT =
                                    invoice.fieldsData?.amountHT ||
                                    invoice.fieldsData?.montantHT ||
                                    invoice.fieldsData?.totalHT ||
                                    invoice.fieldsData?.baseHT ||
                                    null
                                const amountTVA =
                                    invoice.fieldsData?.amountTVA ||
                                    invoice.fieldsData?.montantTVA ||
                                    invoice.fieldsData?.tvaAmount ||
                                    invoice.fieldsData?.tva ||
                                    null
                                const amountTTC =
                                    invoice.fieldsData?.amountTTC ||
                                    invoice.fieldsData?.montantTTC ||
                                    invoice.fieldsData?.totalTTC ||
                                    invoice.fieldsData?.total ||
                                    null

                                return (
                                    <TableRow
                                        key={invoice.id}
                                        className="border-border/50 hover:bg-accent/30 transition-colors cursor-pointer"
                                        onClick={() => onView(invoice)}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                                    <FileText className="h-4 w-4 text-primary" />
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
                                            <span className="text-sm text-muted-foreground">
                                                {invoiceDate ? formatDate(String(invoiceDate)) : "—"}
                                            </span>
                                        </TableCell>

                                        <TableCell>
                                            <span className="text-sm text-muted-foreground font-mono">{String(invoiceNumber)}</span>
                                        </TableCell>

                                        <TableCell className="text-right">
                                            {amountHT !== null && amountHT !== undefined ? (
                                                <span className="text-sm text-foreground">
                                                    {Number(amountHT).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">—</span>
                                            )}
                                        </TableCell>

                                        <TableCell className="text-right">
                                            {amountTVA !== null && amountTVA !== undefined ? (
                                                <span className="text-sm text-muted-foreground">
                                                    {Number(amountTVA).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">—</span>
                                            )}
                                        </TableCell>

                                        <TableCell className="text-right">
                                            {amountTTC !== null && amountTTC !== undefined ? (
                                                <span className="text-sm font-semibold text-foreground">
                                                    {Number(amountTTC).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">—</span>
                                            )}
                                        </TableCell>

                                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>

                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1">
                                            {onComptabiliser && canComptabiliser && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 gap-1.5 text-xs border-blue-500/40 text-blue-500 hover:bg-blue-500/10 hover:text-blue-500"
                                                    disabled={isComptabilisant}
                                                    onClick={() => handleComptabiliser(invoice.id)}
                                                >
                                                    {isComptabilisant
                                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        : <BookCheck className="h-3.5 w-3.5" />
                                                    }
                                                    Comptabiliser
                                                </Button>
                                            )}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                        disabled={isProcessing || isValidating || isDeleting || isComptabilisant}
                                                    >
                                                        {(isProcessing || isValidating || isDeleting || isComptabilisant) ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 bg-popover border-border/50">
                                                    <DropdownMenuItem
                                                        onClick={() => onView(invoice)}
                                                        className="gap-2 cursor-pointer"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        Voir les détails
                                                    </DropdownMenuItem>
                                                    {onProcess && canProcess && (
                                                        <DropdownMenuItem
                                                            onClick={() => handleProcess(invoice.id)}
                                                            className="gap-2 cursor-pointer"
                                                            disabled={isProcessing}
                                                        >
                                                            <RefreshCw className="h-4 w-4" />
                                                            Retraiter
                                                        </DropdownMenuItem>
                                                    )}
                                                    {onValidate && canValidate && (
                                                        <DropdownMenuItem
                                                            onClick={() => handleValidate(invoice.id)}
                                                            className="gap-2 cursor-pointer text-emerald-500 focus:text-emerald-500"
                                                            disabled={isValidating}
                                                        >
                                                            <CheckCircle2 className="h-4 w-4" />
                                                            Valider
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(invoice.id)}
                                                        className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                                                        disabled={isDeleting}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        Supprimer
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
