"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { InvoiceDto } from "@/src/types";
import { InvoiceService } from "@/src/api/services/invoice.service";

interface InvoiceTableProps {
  invoices: InvoiceDto[];
  onView: (invoice: InvoiceDto) => void;
  onDelete: (id: number) => void;
  onProcess?: (id: number) => void;
  onValidate?: (id: number) => void;
  onComptabiliser?: (id: number) => void;
}

interface JournalEntryPreview {
  id?: number;
  AC?: number | string;
  numero?: number | string;
  entryDate?: string;
  supplier?: string;
  journal?: string;
  accountNumber?: string;
  label?: string;
  debit?: number | string | null;
  credit?: number | string | null;
}

function pickField(
  source: Record<string, any> | undefined,
  keys: string[],
): string {
  if (!source) return "";
  for (const key of keys) {
    const val = source[key];
    if (val !== undefined && val !== null && String(val).trim() !== "")
      return String(val);
  }
  return "";
}

function pickNumber(
  source: Record<string, any> | undefined,
  keys: string[],
): number {
  const raw = pickField(source, keys);
  if (!raw) return 0;
  const num = Number(String(raw).replace(",", "."));
  return Number.isFinite(num) ? num : 0;
}

function buildLocalJournalPreview(invoice: InvoiceDto): JournalEntryPreview[] {
  const fd = invoice.fieldsData || {};
  const entryDate =
    pickField(fd, ["invoiceDate", "dateFacture", "date"]) ||
    (invoice.createdAt ? String(invoice.createdAt) : "");
  const supplier =
    pickField(fd, ["supplier", "fournisseur", "supplierName"]) ||
    invoice.originalName ||
    "";
  const journal = pickField(fd, ["journal", "purchaseJournal"]) || "ACHAT";
  const chargeAccount = pickField(fd, [
    "chargeAccount",
    "comptHt",
    "compteHt",
    "accountHt",
  ]);
  const tvaAccount = pickField(fd, [
    "tvaAccount",
    "comptTva",
    "compteTva",
    "accountTva",
  ]);
  const supplierAccount = pickField(fd, [
    "tierNumber",
    "collectifAccount",
    "comptTier",
    "compteTier",
    "tierAccount",
  ]);
  const amountHT = pickNumber(fd, [
    "amountHT",
    "montantHT",
    "totalHT",
    "baseHT",
  ]);
  const amountTVA = pickNumber(fd, [
    "amountTVA",
    "montantTVA",
    "tvaAmount",
    "tva",
  ]);
  const amountTTC =
    pickNumber(fd, ["amountTTC", "montantTTC", "totalTTC", "total"]) ||
    amountHT + amountTVA;

  const entries: JournalEntryPreview[] = [];
  if (chargeAccount && amountHT > 0) {
    entries.push({
      entryDate,
      supplier,
      journal,
      accountNumber: chargeAccount,
      label: "HT",
      debit: amountHT,
      credit: 0,
    });
  }
  if (tvaAccount && amountTVA > 0) {
    entries.push({
      entryDate,
      supplier,
      journal,
      accountNumber: tvaAccount,
      label: "TVA",
      debit: amountTVA,
      credit: 0,
    });
  }
  if (supplierAccount && amountTTC > 0) {
    entries.push({
      entryDate,
      supplier,
      journal,
      accountNumber: supplierAccount,
      label: "TTC",
      debit: 0,
      credit: amountTTC,
    });
  }
  return entries;
}

function getStatusBadge(status: string | undefined) {
  switch ((status || "").toUpperCase()) {
    case "PENDING":
      return (
        <Badge className="bg-sky-400/10 text-sky-500 border-sky-400/30">
          En attente
        </Badge>
      );
    case "PROCESSING":
      return (
        <Badge className="bg-blue-500/10 text-blue-600 border-blue-400/30 animate-pulse">
          En cours
        </Badge>
      );
    case "TREATED":
      return (
        <Badge className="bg-blue-700/10 text-blue-800 border-blue-700/30">
          TraitÃ©
        </Badge>
      );
    case "READY_TO_VALIDATE":
      return (
        <Badge className="bg-emerald-400/10 text-emerald-500 border-emerald-400/30">
          PrÃªt Ã  valider
        </Badge>
      );
    case "VALIDATED":
      return (
        <Badge className="bg-emerald-600 text-white border-emerald-700">
          ValidÃ©
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge className="bg-destructive text-white border-destructive">
          RejetÃ©
        </Badge>
      );
    case "ERROR":
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/30">
          Erreur
        </Badge>
      );
    case "TO_VERIFY":
    case "VERIFY":
      return (
        <Badge className="bg-orange-400/10 text-orange-500 border-orange-400/30">
          Ã€ vÃ©rifier
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground border-muted">
          {status || "-"}
        </Badge>
      );
  }
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "-";
  try {
    const raw = String(dateStr).trim();

    // Handle common OCR/accounting formats explicitly: dd/MM/yyyy, dd-MM-yyyy, yyyy-MM-dd, yyyy/MM/dd
    const m = raw.match(/^(\d{1,4})[\/-](\d{1,2})[\/-](\d{1,4})$/);
    let date: Date | null = null;

    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      const c = Number(m[3]);

      // yyyy-MM-dd or yyyy/MM/dd
      if (m[1].length === 4) {
        date = new Date(a, b - 1, c);
      } else {
        // dd/MM/yyyy or dd-MM-yyyy
        const year = m[3].length === 2 ? 2000 + c : c;
        date = new Date(year, b - 1, a);
      }
    } else {
      date = new Date(raw);
    }

    if (!date || Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

function formatAmount(val: unknown): string {
  if (val === null || val === undefined || val === "") return "-";
  const num = Number(val);
  if (Number.isNaN(num)) return String(val);
  return num.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function InvoiceTable({
  invoices,
  onView,
  onDelete,
  onProcess,
  onValidate,
  onComptabiliser,
}: InvoiceTableProps) {
  const [search, setSearch] = useState("");
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [validatingIds, setValidatingIds] = useState<Set<number>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [comptabilisantIds, setComptabilisantIds] = useState<Set<number>>(
    new Set(),
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSubmitting, setPreviewSubmitting] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewWarning, setPreviewWarning] = useState<string | null>(null);
  const [previewEntries, setPreviewEntries] = useState<JournalEntryPreview[]>(
    [],
  );
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDto | null>(
    null,
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv) => {
      const name = (inv.originalName || inv.filename || "").toLowerCase();
      const supplier = String(
        inv.fieldsData?.supplier || inv.fieldsData?.fournisseur || "",
      ).toLowerCase();
      const number = String(
        inv.fieldsData?.invoiceNumber || inv.fieldsData?.numeroFacture || "",
      ).toLowerCase();
      const template = (inv.templateName || "").toLowerCase();
      return (
        name.includes(q) ||
        supplier.includes(q) ||
        number.includes(q) ||
        template.includes(q)
      );
    });
  }, [invoices, search]);

  const handleProcess = async (id: number) => {
    if (!onProcess) return;
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      await onProcess(id);
    } finally {
      setProcessingIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  };

  const handleValidate = async (id: number) => {
    if (!onValidate) return;
    setValidatingIds((prev) => new Set(prev).add(id));
    try {
      await onValidate(id);
    } finally {
      setValidatingIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await onDelete(id);
    } finally {
      setDeletingIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  };

  const handleComptabiliser = async (id: number) => {
    if (!onComptabiliser) return;
    setComptabilisantIds((prev) => new Set(prev).add(id));
    try {
      await onComptabiliser(id);
    } finally {
      setComptabilisantIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  };

  const openComptabiliserDialog = async (invoice: InvoiceDto) => {
    setSelectedInvoice(invoice);
    setPreviewEntries([]);
    setPreviewError(null);
    setPreviewWarning(null);
    setPreviewLoading(true);
    setPreviewOpen(true);
    try {
      const preview = await InvoiceService.previewComptabilisation(invoice.id);
      const entries = Array.isArray(preview?.entries) ? preview.entries : [];
      setPreviewEntries(entries as JournalEntryPreview[]);
      const missingAccounts = Array.isArray(preview?.missingAccounts)
        ? preview.missingAccounts.filter((item: unknown) => String(item || "").trim() !== "")
        : [];
      if (missingAccounts.length > 0) {
        setPreviewWarning(
          `Comptes manquants: ${missingAccounts.join(", ")}. Le journal sera généré avec des comptes provisoires.`,
        );
      }
    } catch (err: any) {
      const localEntries = buildLocalJournalPreview(invoice);
      if (localEntries.length > 0) {
        setPreviewEntries(localEntries);
        setPreviewWarning(
          "AperÃ§u backend indisponible: affichage d'un aperÃ§u local basÃ© sur les champs extraits.",
        );
      } else {
        const details = err?.details?.details || err?.details;
        const apiError = err?.details?.error || err?.details?.message || err?.message;
        const message = Array.isArray(details)
          ? details.join(", ")
          : (details ? String(details) : (apiError || "Impossible de charger l'aperÃ§u du journal"));
        setPreviewError(message);
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmComptabilisation = async () => {
    if (!selectedInvoice || !onComptabiliser) return;
    setPreviewSubmitting(true);
    try {
      await handleComptabiliser(selectedInvoice.id);
      setPreviewOpen(false);
    } finally {
      setPreviewSubmitting(false);
    }
  };

  if (invoices.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">Aucune facture</p>
            <p className="text-sm text-muted-foreground mt-1">
              Uploadez des factures pour commencer
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/50 bg-card/50">
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium">
                    Fichier
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    Fournisseur
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    Date Facture
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    N° Facture
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">
                    Montant HT
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">
                    Montant TVA
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">
                    Montant TTC
                  </TableHead>
                 
                  <TableHead className="text-muted-foreground font-medium text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((invoice) => {
                  const isProcessing = processingIds.has(invoice.id);
                  const isValidating = validatingIds.has(invoice.id);
                  const isDeleting = deletingIds.has(invoice.id);
                  const isComptabilisant = comptabilisantIds.has(invoice.id);
                  const statusUp = (invoice.status || "").toUpperCase();
                  const canProcess = !["VALIDATED", "REJECTED"].includes(
                    statusUp,
                  );
                  const canValidate =
                    statusUp === "READY_TO_VALIDATE" || invoice.canValidate;
                  const canComptabiliser =
                    statusUp === "VALIDATED" && !invoice.accounted;

                  const supplier =
                    invoice.fieldsData?.supplier ||
                    invoice.fieldsData?.fournisseur ||
                    invoice.fieldsData?.supplierName ||
                    "";
                  const invoiceNumber =
                    invoice.fieldsData?.invoiceNumber ||
                    invoice.fieldsData?.numeroFacture ||
                    invoice.fieldsData?.invoice_number ||
                    "";
                  const invoiceDate =
                    invoice.fieldsData?.invoiceDate ||
                    invoice.fieldsData?.dateFacture ||
                    invoice.fieldsData?.date ||
                    null;
                  const amountHT =
                    invoice.fieldsData?.amountHT ||
                    invoice.fieldsData?.montantHT ||
                    invoice.fieldsData?.totalHT ||
                    invoice.fieldsData?.baseHT ||
                    null;
                  const amountTVA =
                    invoice.fieldsData?.amountTVA ||
                    invoice.fieldsData?.montantTVA ||
                    invoice.fieldsData?.tvaAmount ||
                    invoice.fieldsData?.tva ||
                    null;
                  const amountTTC =
                    invoice.fieldsData?.amountTTC ||
                    invoice.fieldsData?.montantTTC ||
                    invoice.fieldsData?.totalTTC ||
                    invoice.fieldsData?.total ||
                    null;

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
                            <p className="text-xs text-muted-foreground">
                              #{invoice.id}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm text-foreground">
                          {String(supplier)}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {invoiceDate ? formatDate(String(invoiceDate)) : "-"}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm text-muted-foreground font-mono">
                          {String(invoiceNumber)}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        {amountHT !== null && amountHT !== undefined ? (
                          <span className="text-sm text-foreground">
                            {Number(amountHT).toLocaleString("fr-FR", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                           -
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {amountTVA !== null && amountTVA !== undefined ? (
                          <span className="text-sm text-muted-foreground">
                            {Number(amountTVA).toLocaleString("fr-FR", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {amountTTC !== null && amountTTC !== undefined ? (
                          <span className="text-sm font-semibold text-foreground">
                            {Number(amountTTC).toLocaleString("fr-FR", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                           -
                          </span>
                        )}
                      </TableCell>

                   

                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs border-blue-500/40 text-blue-500 hover:bg-blue-500/10 hover:text-blue-500"
                            disabled={isComptabilisant}
                            onClick={() => openComptabiliserDialog(invoice)}
                          >
                            {isComptabilisant ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <BookCheck className="h-3.5 w-3.5" />
                            )}
                            Comptabiliser
                          </Button>
                        

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                disabled={
                                  isProcessing ||
                                  isValidating ||
                                  isDeleting ||
                                  isComptabilisant
                                }
                              >
                                {isProcessing ||
                                isValidating ||
                                isDeleting ||
                                isComptabilisant ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 bg-popover border-border/50"
                            >
                              <DropdownMenuItem
                                onClick={() => onView(invoice)}
                                className="gap-2 cursor-pointer"
                              >
                                <Eye className="h-4 w-4" />
                                Voir les dÃ©tails
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
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Journal de la facture</DialogTitle>
            <DialogDescription>
              {selectedInvoice
                ? `${selectedInvoice.originalName || selectedInvoice.filename} (#${selectedInvoice.id})`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {previewLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}

          {!previewLoading && previewError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {previewError}
            </div>
          )}
          {!previewLoading && !previewError && previewWarning && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700">
              {previewWarning}
            </div>
          )}

          {!previewLoading && !previewError && (
            <div className="rounded-md border overflow-hidden">
              <div className="max-h-[55vh] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                    <TableHead>Numero</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Journal</TableHead>
                    <TableHead>Compte</TableHead>
                    <TableHead>Libelle</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewEntries.length === 0 ? (
                      <TableRow>
                      <TableCell
                          colSpan={8}
                          className="text-center text-muted-foreground"
                        >
                          Aucune ecriture a afficher
                        </TableCell>
                      </TableRow>
                    ) : (
                      previewEntries.map((entry, idx) => (
                        <TableRow key={`${entry.id ?? "new"}-${idx}`}>
                          <TableCell className="font-mono text-xs">
                            {String(entry.AC ?? entry.numero ?? 1)}
                          </TableCell>
                          <TableCell>
                            {entry.entryDate
                              ? formatDate(String(entry.entryDate))
                              : "-"}
                          </TableCell>
                          <TableCell>{entry.supplier || "-"}</TableCell>
                          <TableCell>{entry.journal || "-"}</TableCell>
                          <TableCell className="font-mono">
                            {entry.accountNumber || "-"}
                          </TableCell>
                          <TableCell className="max-w-[280px] truncate" title={entry.label || ""}>
                            {entry.label || "-"}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatAmount(entry.debit)}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600">
                            {formatAmount(entry.credit)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Fermer
            </Button>
            <Button
              onClick={confirmComptabilisation}
              disabled={
                previewLoading ||
                !!previewError ||
                previewSubmitting ||
                previewEntries.length === 0
              }
              className="gap-2"
            >
              {previewSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Comptabiliser
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

