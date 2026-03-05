"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
    Loader2,
    ArrowLeft,
    FileText,
    CheckCircle2,
    RefreshCw,
    Trash2,
    ExternalLink,
    Tag,
    AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { InvoiceService } from "@/src/api/services/invoice.service"
import { InvoiceDto } from "@/src/types"
import { toast } from "sonner"

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
            return <Badge variant="outline">{status || "—"}</Badge>
    }
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2.5">
            <span className="text-sm text-muted-foreground shrink-0 w-40">{label}</span>
            <span className="text-sm text-foreground text-right font-medium flex-1">{value ?? "—"}</span>
        </div>
    )
}

export default function InvoiceDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = Number(params.id)

    const [invoice, setInvoice] = useState<InvoiceDto | null>(null)
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const [validating, setValidating] = useState(false)

    const load = async () => {
        try {
            const data = await InvoiceService.getById(id)
            setInvoice(data)
        } catch {
            toast.error("Impossible de charger la facture")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (id) load()
    }, [id])

    // Poll while processing
    useEffect(() => {
        if (!invoice) return
        const s = (invoice.status || "").toUpperCase()
        if (!["PENDING", "PROCESSING"].includes(s)) return
        const interval = setInterval(load, 3000)
        return () => clearInterval(interval)
    }, [invoice?.status])

    const handleProcess = async () => {
        if (!invoice) return
        setProcessing(true)
        try {
            const updated = await InvoiceService.process(invoice.id)
            setInvoice({ ...invoice, ...updated })
            toast.success("Retraitement lancé")
            setTimeout(load, 1500)
        } catch {
            toast.error("Erreur lors du retraitement")
        } finally {
            setProcessing(false)
        }
    }

    const handleValidate = async () => {
        if (!invoice) return
        setValidating(true)
        try {
            const updated = await InvoiceService.validate(invoice.id)
            setInvoice({ ...invoice, ...updated })
            toast.success("Facture validée")
        } catch {
            toast.error("Erreur lors de la validation")
        } finally {
            setValidating(false)
        }
    }

    const handleDelete = async () => {
        if (!invoice) return
        if (!confirm("Supprimer cette facture ?")) return
        try {
            await InvoiceService.delete(invoice.id)
            toast.success("Facture supprimée")
            router.push("/invoices/list")
        } catch {
            toast.error("Erreur lors de la suppression")
        }
    }

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!invoice) {
        return (
            <div className="container mx-auto py-6">
                <Card className="border-border/50 bg-card/50">
                    <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
                        <AlertCircle className="h-10 w-10 text-destructive" />
                        <p className="text-foreground font-medium">Facture introuvable</p>
                        <Button variant="outline" onClick={() => router.push("/invoices/list")}>
                            Retour à la liste
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const statusUp = (invoice.status || "").toUpperCase()
    const canProcess = !["VALIDATED", "REJECTED"].includes(statusUp)
    const canValidate = statusUp === "READY_TO_VALIDATE" || invoice.canValidate
    const confidence = invoice.overallConfidence ?? invoice.averageConfidence

    // Build field rows from fieldsData
    const knownFields: { key: string; label: string }[] = [
        { key: "invoiceNumber",    label: "N° Facture" },
        { key: "numeroFacture",    label: "N° Facture" },
        { key: "invoice_number",   label: "N° Facture" },
        { key: "supplier",         label: "Fournisseur" },
        { key: "fournisseur",      label: "Fournisseur" },
        { key: "supplierName",     label: "Fournisseur" },
        { key: "date",             label: "Date" },
        { key: "invoiceDate",      label: "Date Facture" },
        { key: "amountHT",         label: "Montant HT" },
        { key: "montantHT",        label: "Montant HT" },
        { key: "tva",              label: "TVA" },
        { key: "tvaAmount",        label: "Montant TVA" },
        { key: "amountTTC",        label: "Montant TTC" },
        { key: "montantTTC",       label: "Montant TTC" },
        { key: "totalTTC",         label: "Total TTC" },
        { key: "total",            label: "Total" },
        { key: "ice",              label: "ICE" },
        { key: "ifNumber",         label: "IF" },
        { key: "rcNumber",         label: "RC" },
        { key: "address",          label: "Adresse" },
        { key: "city",             label: "Ville" },
        { key: "phone",            label: "Téléphone" },
        { key: "email",            label: "Email" },
    ]

    const seenKeys = new Set<string>()
    const fieldRows: { label: string; value: any }[] = []

    for (const { key, label } of knownFields) {
        if (invoice.fieldsData?.[key] !== undefined && !seenKeys.has(label)) {
            fieldRows.push({ label, value: invoice.fieldsData[key] })
            seenKeys.add(label)
        }
    }

    // Remaining unknown fields
    const extraRows = Object.entries(invoice.fieldsData || {})
        .filter(([k]) => !knownFields.some((f) => f.key === k))
        .map(([k, v]) => ({ label: k, value: v }))

    const fileUrl = invoice.filePath
        ? InvoiceService.getFileUrl(invoice.filename)
        : null

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/invoices/list")}
                    className="text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-xl font-semibold text-foreground truncate">
                            {invoice.originalName || invoice.filename}
                        </h1>
                        {getStatusBadge(invoice.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">ID #{invoice.id}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {fileUrl && (
                        <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="gap-2 border-border/50 bg-transparent"
                        >
                            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                                Voir fichier
                            </a>
                        </Button>
                    )}
                    {canProcess && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleProcess}
                            disabled={processing}
                            className="gap-2 border-border/50 bg-transparent"
                        >
                            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            Retraiter
                        </Button>
                    )}
                    {canValidate && (
                        <Button
                            size="sm"
                            onClick={handleValidate}
                            disabled={validating}
                            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Valider
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDelete}
                        className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 bg-transparent"
                    >
                        <Trash2 className="h-4 w-4" />
                        Supprimer
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Extracted Fields */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-border/50 bg-card/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <FileText className="h-4 w-4 text-primary" />
                                Données extraites
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {fieldRows.length === 0 && extraRows.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4 text-center">
                                    Aucun champ extrait pour le moment
                                </p>
                            ) : (
                                <div className="divide-y divide-border/50">
                                    {fieldRows.map(({ label, value }) => (
                                        <FieldRow key={label} label={label} value={String(value)} />
                                    ))}
                                    {extraRows.length > 0 && (
                                        <>
                                            {fieldRows.length > 0 && <Separator className="my-2" />}
                                            {extraRows.map(({ label, value }) => (
                                                <FieldRow key={label} label={label} value={String(value)} />
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Missing / Low Confidence Fields */}
                    {((invoice.missingFields?.length ?? 0) > 0 || (invoice.lowConfidenceFields?.length ?? 0) > 0) && (
                        <Card className="border-orange-400/30 bg-orange-400/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base text-orange-500">
                                    <AlertCircle className="h-4 w-4" />
                                    Champs à vérifier
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {(invoice.missingFields?.length ?? 0) > 0 && (
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                            Champs manquants
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {invoice.missingFields!.map((f) => (
                                                <Badge key={f} variant="outline" className="text-xs border-destructive/30 text-destructive">
                                                    {f}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {(invoice.lowConfidenceFields?.length ?? 0) > 0 && (
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                            Faible confiance
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {invoice.lowConfidenceFields!.map((f) => (
                                                <Badge key={f} variant="outline" className="text-xs border-orange-400/30 text-orange-500">
                                                    {f}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right: Metadata */}
                <div className="space-y-6">
                    <Card className="border-border/50 bg-card/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Tag className="h-4 w-4 text-primary" />
                                Informations
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="divide-y divide-border/50">
                                <FieldRow label="Statut" value={getStatusBadge(invoice.status)} />
                                <FieldRow
                                    label="Confiance"
                                    value={
                                        confidence !== undefined ? (
                                            <span className={
                                                confidence >= 0.8 ? "text-emerald-500" :
                                                confidence >= 0.5 ? "text-orange-500" : "text-destructive"
                                            }>
                                                {Math.round(confidence * 100)}%
                                            </span>
                                        ) : "—"
                                    }
                                />
                                <FieldRow
                                    label="Template"
                                    value={
                                        invoice.templateName ? (
                                            <span className="text-xs bg-muted/50 px-2 py-0.5 rounded-full">
                                                {invoice.templateName}
                                            </span>
                                        ) : "—"
                                    }
                                />
                                <FieldRow
                                    label="Méthode"
                                    value={invoice.extractionMethod || "—"}
                                />
                                <FieldRow
                                    label="Créé le"
                                    value={invoice.createdAt
                                        ? new Date(invoice.createdAt).toLocaleDateString("fr-FR")
                                        : "—"
                                    }
                                />
                                <FieldRow
                                    label="Validé le"
                                    value={invoice.validatedAt
                                        ? new Date(invoice.validatedAt).toLocaleDateString("fr-FR")
                                        : "—"
                                    }
                                />
                                {invoice.validatedBy && (
                                    <FieldRow label="Validé par" value={invoice.validatedBy} />
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
