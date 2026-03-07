"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { InvoiceService } from "@/src/api/services/invoice.service";
import { InvoiceDto } from "@/src/types";
import { toast } from "sonner";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

// Setup PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
          Traité
        </Badge>
      );
    case "READY_TO_VALIDATE":
      return (
        <Badge className="bg-emerald-400/10 text-emerald-500 border-emerald-400/30">
          Prêt à valider
        </Badge>
      );
    case "VALIDATED":
      return (
        <Badge className="bg-emerald-600 text-white border-emerald-700">
          Validé
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge className="bg-destructive text-white border-destructive">
          Rejeté
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
          À vérifier
        </Badge>
      );
    default:
      return <Badge variant="outline">{status || "-"}</Badge>;
  }
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-sm text-muted-foreground shrink-0 w-40">
        {label}
      </span>
      <span className="text-sm text-foreground text-right font-medium flex-1">
        {value ?? "-"}
      </span>
    </div>
  );
}

const EDITABLE_DETAIL_FIELDS = [
  {
    id: "supplier",
    label: "Fournisseur",
    keys: ["supplier", "fournisseur", "supplierName"],
  },
  {
    id: "invoiceDate",
    label: "Date Facture",
    keys: ["invoiceDate", "date", "dateFacture"],
  },
  {
    id: "invoiceNumber",
    label: "N° Facture",
    keys: ["invoiceNumber", "numeroFacture", "invoice_number"],
  },
  {
    id: "amountHT",
    label: "Montant HT",
    keys: ["amountHT", "montantHT", "totalHT", "baseHT"],
  },
  {
    id: "amountTVA",
    label: "Montant TVA",
    keys: ["amountTVA", "montantTVA", "tvaAmount", "tva"],
  },
  {
    id: "amountTTC",
    label: "Montant TTC",
    keys: ["amountTTC", "montantTTC", "totalTTC", "total"],
  },
  {
    id: "comptTier",
    label: "Compt Tier",
    keys: ["comptTier", "compteTier", "tierAccount", "compte_tier"],
  },
  {
    id: "comptHt",
    label: "Compt HT",
    keys: ["comptHt", "compteHt", "accountHt", "compte_ht"],
  },
  {
    id: "comptTva",
    label: "Compt TVA",
    keys: ["comptTva", "compteTva", "accountTva", "compte_tva"],
  },
  { id: "ice", label: "ICE", keys: ["ice"] },
  { id: "ifNumber", label: "IF", keys: ["ifNumber", "if", "taxId"] },
  { id: "rcNumber", label: "RC", keys: ["rcNumber", "rc", "tradeRegister"] },
];

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number((params as any).id);

  const [invoice, setInvoice] = useState<InvoiceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(true);
  const [documentLoadError, setDocumentLoadError] = useState(false);
  const [numPages, setNumPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [editableDetails, setEditableDetails] = useState<
    Record<string, string>
  >({});
  const [savingDetails, setSavingDetails] = useState(false);
  const [activePickerFieldId, setActivePickerFieldId] = useState<string | null>(
    null,
  );
  const [isDrawingSelection, setIsDrawingSelection] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const viewerOverlayRef = useRef<HTMLDivElement | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    try {
      const data = await InvoiceService.getById(id);
      setInvoice(data);
    } catch {
      toast.error("Impossible de charger la facture");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  useEffect(() => {
    (async () => {
      const { pdfjs } = await import("react-pdf");
      pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    })();
  }, []);

  // Poll while processing
  useEffect(() => {
    if (!invoice) return;
    const s = (invoice.status || "").toUpperCase();
    if (!["PENDING", "PROCESSING"].includes(s)) return;
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [invoice?.status]);

  const fileUrl = invoice?.filePath
    ? InvoiceService.getFileUrl(invoice.filename)
    : null;
  const sourceName = invoice?.originalName || invoice?.filename || "";
  const isPdf = Boolean(sourceName.match(/\.pdf(?:$|\?)/i));
  const isImage = Boolean(
    sourceName.match(/\.(jpg|jpeg|png|gif|webp)(?:$|\?)/i),
  );

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    const looksRenderable = Boolean(
      sourceName.match(/\.(pdf|jpg|jpeg|png|gif|webp)(?:$|\?)/i),
    );

    const loadDocument = async () => {
      setPageNumber(1);
      setNumPages(1);
      setDocumentLoadError(false);
      setIsLoadingDocument(looksRenderable);
      setActivePickerFieldId(null);
      setSelectionRect(null);
      setIsDrawingSelection(false);

      if (!invoice?.filename) {
        setDocumentUrl(null);
        return;
      }

      try {
        const blob = await InvoiceService.downloadFile(invoice.filename);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setDocumentUrl(objectUrl);
      } catch {
        if (cancelled) return;
        setDocumentUrl(fileUrl);
        setDocumentLoadError(true);
      }
    };

    loadDocument();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [invoice?.filename, sourceName, fileUrl]);

  useEffect(() => {
    const source = invoice?.fieldsData || {};
    const initialValues: Record<string, string> = {};
    for (const field of EDITABLE_DETAIL_FIELDS) {
      const value = pickFirstValue(source, field.keys);
      initialValues[field.id] =
        value === "Ã¢â‚¬â€" || value === "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â" ? "" : value;
    }
    setEditableDetails(initialValues);
  }, [invoice?.id, invoice?.updatedAt, invoice?.fieldsData]);

  const handleProcess = async () => {
    if (!invoice) return;
    setProcessing(true);
    try {
      const updated = await InvoiceService.process(invoice.id);
      setInvoice({ ...invoice, ...updated });
      toast.success("Retraitement lancÃ©");
      setTimeout(load, 1500);
    } catch {
      toast.error("Erreur lors du retraitement");
    } finally {
      setProcessing(false);
    }
  };

  const handleValidate = async () => {
    if (!invoice) return;
    setValidating(true);
    try {
      const updated = await InvoiceService.validate(invoice.id);
      setInvoice({ ...invoice, ...updated });
      toast.success("Facture validÃ©e");
    } catch {
      toast.error("Erreur lors de la validation");
    } finally {
      setValidating(false);
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    if (!confirm("Supprimer cette facture ?")) return;
    try {
      await InvoiceService.delete(invoice.id);
      toast.success("Facture supprimÃ©e");
      router.push("/invoices/list");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleSaveDetails = async () => {
    if (!invoice) return;
    setSavingDetails(true);
    try {
      const payload: Record<string, string> = {};
      for (const field of EDITABLE_DETAIL_FIELDS) {
        payload[field.keys[0]] = editableDetails[field.id] ?? "";
      }
      const updated = await InvoiceService.updateFields(invoice.id, payload);
      setInvoice(updated);
      toast.success("Details de la facture enregistres");
    } catch {
      toast.error("Erreur lors de l'enregistrement des details");
    } finally {
      setSavingDetails(false);
    }
  };

  const handlePickerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activePickerFieldId || !isPdf || !viewerOverlayRef.current) return;
    e.preventDefault();
    const rect = viewerOverlayRef.current.getBoundingClientRect();
    const scale = zoom / 100;
    const startX = (e.clientX - rect.left) / scale;
    const startY = (e.clientY - rect.top) / scale;
    drawStartRef.current = { x: startX, y: startY };
    setSelectionRect({ x: startX, y: startY, width: 0, height: 0 });
    setIsDrawingSelection(true);
  };

  const handlePickerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      !isDrawingSelection ||
      !drawStartRef.current ||
      !viewerOverlayRef.current
    )
      return;
    e.preventDefault();
    const rect = viewerOverlayRef.current.getBoundingClientRect();
    const scale = zoom / 100;
    const currentX = (e.clientX - rect.left) / scale;
    const currentY = (e.clientY - rect.top) / scale;
    const x = Math.min(drawStartRef.current.x, currentX);
    const y = Math.min(drawStartRef.current.y, currentY);
    const width = Math.abs(currentX - drawStartRef.current.x);
    const height = Math.abs(currentY - drawStartRef.current.y);
    setSelectionRect({ x, y, width, height });
  };

  const handlePickerMouseUp = () => {
    if (
      !isDrawingSelection ||
      !selectionRect ||
      !viewerOverlayRef.current ||
      !pdfContainerRef.current ||
      !activePickerFieldId
    ) {
      setIsDrawingSelection(false);
      drawStartRef.current = null;
      return;
    }

    // Get text layer - try multiple selectors for react-pdf v9
    const textLayer = viewerOverlayRef.current.querySelector(
      ".react-pdf__Page__textLayer, [data-page-number]",
    );
    
    if (!textLayer) {
      toast.error(
        "Couche texte non disponible - assurez-vous que le PDF est un PDF texte (non scanne)",
      );
      setIsDrawingSelection(false);
      drawStartRef.current = null;
      setSelectionRect(null);
      setActivePickerFieldId(null);
      return;
    }

    const overlayRect = viewerOverlayRef.current.getBoundingClientRect();
    const scale = zoom / 100;

    // Calculate the selected area in scaled coordinates
    const selectedClientRect = {
      left: overlayRect.left + selectionRect.x * scale,
      top: overlayRect.top + selectionRect.y * scale,
      right: overlayRect.left + (selectionRect.x + selectionRect.width) * scale,
      bottom:
        overlayRect.top + (selectionRect.y + selectionRect.height) * scale,
    };

    // Get all text elements
    const spans = Array.from(
      textLayer.querySelectorAll("span, div, [role='presentation']"),
    ) as HTMLElement[];

    const intersects = (
      a: DOMRect,
      b: { left: number; top: number; right: number; bottom: number },
    ) =>
      a.right >= b.left &&
      a.left <= b.right &&
      a.bottom >= b.top &&
      a.top <= b.bottom;

    // Collect text from intersecting spans
    const text = spans
      .filter((span) => {
        const spanRect = span.getBoundingClientRect();
        // Check if span is visible and has content
        const hasContent =
          span.textContent && span.textContent.trim().length > 0;
        const isVisible = spanRect.width > 0 && spanRect.height > 0;
        return (
          hasContent && isVisible && intersects(spanRect, selectedClientRect)
        );
      })
      .map((span) => span.textContent || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (text) {
      setEditableDetails((prev) => ({ ...prev, [activePickerFieldId]: text }));
      toast.success("Texte extrait depuis la zone selectionnee");
    } else {
      toast.error("Aucun texte detecte dans la zone selectionnee");
    }

    setIsDrawingSelection(false);
    drawStartRef.current = null;
    setSelectionRect(null);
    setActivePickerFieldId(null);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="w-full py-6">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-foreground font-medium">Facture introuvable</p>
            <Button
              variant="outline"
              onClick={() => router.push("/invoices/list")}
            >
              Retour à la liste
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusUp = (invoice.status || "").toUpperCase();
  const canProcess = !["VALIDATED", "REJECTED"].includes(statusUp);
  const canValidate = statusUp === "READY_TO_VALIDATE" || invoice.canValidate;
  const confidence = invoice.overallConfidence ?? invoice.averageConfidence;
  const fieldsData = invoice.fieldsData || {};

  const requestedRows = EDITABLE_DETAIL_FIELDS.map((field) => ({
    id: field.id,
    label: field.label,
    value: editableDetails[field.id] ?? "",
  }));

  // Build field rows from fieldsData
  const knownFields: { key: string; label: string }[] = [
    { key: "invoiceNumber", label: "N° Facture" },
    { key: "numeroFacture", label: "N° Facture" },
    { key: "invoice_number", label: "N° Facture" },
    { key: "supplier", label: "Fournisseur" },
    { key: "fournisseur", label: "Fournisseur" },
    { key: "supplierName", label: "Fournisseur" },
    { key: "date", label: "Date" },
    { key: "invoiceDate", label: "Date Facture" },
    { key: "amountHT", label: "Montant HT" },
    { key: "montantHT", label: "Montant HT" },
    { key: "tva", label: "TVA" },
    { key: "tvaAmount", label: "Montant TVA" },
    { key: "amountTTC", label: "Montant TTC" },
    { key: "montantTTC", label: "Montant TTC" },
    { key: "totalTTC", label: "Total TTC" },
    { key: "total", label: "Total" },
    { key: "ice", label: "ICE" },
    { key: "ifNumber", label: "IF" },
    { key: "rcNumber", label: "RC" },
    { key: "address", label: "Adresse" },
    { key: "city", label: "Ville" },
    { key: "phone", label: "Telephone" },
    { key: "email", label: "Email" },
  ];

  const seenKeys = new Set<string>();
  const fieldRows: { label: string; value: any }[] = [];

  for (const { key, label } of knownFields) {
    if (fieldsData[key] !== undefined && !seenKeys.has(label)) {
      fieldRows.push({ label, value: fieldsData[key] });
      seenKeys.add(label);
    }
  }

  // Remaining unknown fields
  const extraRows = Object.entries(fieldsData)
    .filter(([k]) => !knownFields.some((f) => f.key === k))
    .map(([k, v]) => ({ label: k, value: v }));

  return (
    <div className="flex flex-col py-0 space-y-6">
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
          <p className="text-sm text-muted-foreground mt-0.5">
            ID #{invoice.id}
          </p>
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
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
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
              {validating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
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

      <div className="grid grid-cols-2 gap-4 min-h-[600px]">
        {/* Left: Extracted Fields */}
        <div className="w-full flex flex-col">
          <Card className="border-border/50 bg-card/50 w-full flex-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                Details de la facture
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              <div className="space-y-3">
                {requestedRows.map((row) => (
                  <div key={row.id} className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      {row.label}
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={row.value}
                        onChange={(e) =>
                          setEditableDetails((prev) => ({
                            ...prev,
                            [row.id]: e.target.value,
                          }))
                        }
                      />
                      <Button
                        type="button"
                        variant={
                          activePickerFieldId === row.id ? "default" : "outline"
                        }
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => {
                          if (!isPdf) {
                            toast.error(
                              "Selection par zone disponible uniquement pour les PDF",
                            );
                            return;
                          }
                          setSelectionRect(null);
                          setIsDrawingSelection(false);
                          setActivePickerFieldId((prev) =>
                            prev === row.id ? null : row.id,
                          );
                        }}
                        title="Selectionner une zone sur le PDF"
                      >
                        <Target className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-4">
                <Button
                  onClick={handleSaveDetails}
                  disabled={savingDetails}
                  className="w-full gap-2"
                >
                  {savingDetails && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Enregistrer les details
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Document */}
        <div className="w-full flex flex-col">
          <Card className="border-border/50 bg-card/50 flex-1 overflow-hidden flex flex-col">
            <CardHeader className="py-3 px-4 border-b border-border/50">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-primary" />
                  Document
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setZoom((z) => Math.max(50, z - 25))}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs w-9 text-center">{zoom}%</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setZoom((z) => Math.min(200, z + 25))}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-4 bg-muted/20">
              {activePickerFieldId && isPdf && (
                <div className="mb-3 text-xs text-primary">
                  Mode selection actif: tracez un rectangle sur le PDF pour
                  remplir le champ.
                </div>
              )}
              {!documentUrl && (
                <div className="h-full min-h-80 flex items-center justify-center text-sm text-muted-foreground text-center">
                  Document indisponible pour cette facture
                </div>
              )}

              {documentUrl && (
                <div
                  ref={viewerOverlayRef}
                  className={
                    activePickerFieldId && isPdf
                      ? "relative inline-block origin-top-left select-none [&_.react-pdf__Page__textLayer]:pointer-events-none [&_.react-pdf__Page__textLayer]:select-none"
                      : "relative inline-block origin-top-left"
                  }
                  style={{ transform: `scale(${zoom / 100})` }}
                  onMouseDown={handlePickerMouseDown}
                  onMouseMove={handlePickerMouseMove}
                  onMouseUp={handlePickerMouseUp}
                  onMouseLeave={handlePickerMouseUp}
                >
                  {isPdf && (
                    <div ref={pdfContainerRef}>
                      <Document
                        file={documentUrl}
                        loading={
                          <div className="flex h-96 w-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          </div>
                        }
                        onLoadSuccess={({ numPages }) => {
                          setNumPages(numPages);
                          setIsLoadingDocument(false);
                        }}
                        onLoadError={() => {
                          setIsLoadingDocument(false);
                          setDocumentLoadError(true);
                        }}
                      >
                        <Page
                          pageNumber={pageNumber}
                          width={
                            typeof window !== "undefined"
                              ? window.innerWidth * 0.9
                              : 850
                          }
                          renderTextLayer={true}
                          renderAnnotationLayer={true}
                          loading=""
                        />
                      </Document>
                    </div>
                  )}

                  {isImage && (
                    <img
                      src={documentUrl}
                      alt={invoice.originalName || invoice.filename}
                      className="max-w-full h-auto rounded-md border border-border/50"
                      onLoad={() => setIsLoadingDocument(false)}
                      onError={() => setIsLoadingDocument(false)}
                    />
                  )}

                  {!isPdf && !isImage && (
                    <div className="p-4 text-sm text-muted-foreground">
                      Apercu non supporte pour ce format. Utilisez "Voir
                      fichier".
                    </div>
                  )}

                  {documentLoadError && (
                    <div className="p-4 text-sm text-destructive">
                      Echec de chargement dans l'apercu. Utilisez "Voir
                      fichier".
                    </div>
                  )}

                  {selectionRect && activePickerFieldId && isPdf && (
                    <div
                      className="absolute border-2 border-primary bg-primary/15 pointer-events-none"
                      style={{
                        left: selectionRect.x,
                        top: selectionRect.y,
                        width: selectionRect.width,
                        height: selectionRect.height,
                      }}
                    />
                  )}
                </div>
              )}
            </CardContent>

            {numPages > 1 && (
              <div className="p-2 border-t border-border/50 flex items-center justify-center gap-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  disabled={pageNumber === 1}
                  className="gap-1.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Precedent
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {pageNumber} / {numPages}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setPageNumber((p) => Math.min(numPages, p + 1))
                  }
                  disabled={pageNumber === numPages}
                  className="gap-1.5"
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function pickFirstValue(source: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return "—";
}
