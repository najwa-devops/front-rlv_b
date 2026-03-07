"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle, CloudUpload, Sparkles, Building2 } from "lucide-react"
import type { BankStatementV2 } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { api } from "@/lib/api"
import { type BankOption } from "@/lib/types"

interface FileItem {
    file: File
    id: string
    status: "pending" | "uploading" | "success" | "error"
    progress: number
    error?: string
}

interface UploadBankPageProps {
    onUpload: (files: File[], bankType?: string) => Promise<void>
    onViewBankStatement: (statement: BankStatementV2) => void
    isDemoMode?: boolean
}

export function UploadBankPage({ onUpload, onViewBankStatement, isDemoMode }: UploadBankPageProps) {
    void onViewBankStatement
    void isDemoMode
    const [files, setFiles] = useState<FileItem[]>([])
    const [isDragOver, setIsDragOver] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [selectedBank, setSelectedBank] = useState<string>("AUTO")
    const [supportedBanks, setSupportedBanks] = useState<BankOption[]>([])

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const data = await api.getBankOptions()
                const allOptions = Array.isArray(data.options) ? data.options : []
                setSupportedBanks(allOptions)
                setSelectedBank(allOptions[0]?.code || "AUTO")
            } catch (error) {
                console.error("Error fetching bank options", error)
                setSupportedBanks([{ code: "AUTO", label: "Détection Automatique", mappedTo: "AUTO" }])
                setSelectedBank("AUTO")
            }
        }
        fetchOptions()
    }, [])

    const acceptedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
    ]
    const maxFileSize = 10 * 1024 * 1024

    const validateFile = (file: File): string | null => {
        if (!acceptedTypes.includes(file.type)) {
            return "Format non supporté. Utilisez PDF, XLSX ou XLS."
        }
        if (file.size > maxFileSize) {
            return "Fichier trop volumineux. Maximum 10 Mo."
        }
        return null
    }

    const addFiles = useCallback((newFiles: FileList | File[]) => {
        const fileArray = Array.from(newFiles)
        const newFileItems: FileItem[] = fileArray.map((file) => {
            const error = validateFile(file)
            const item: FileItem = {
                file,
                id: `${file.name}-${Date.now()}-${Math.random()}`,
                status: error ? "error" : "pending",
                progress: 0,
            }
            if (error) {
                item.error = error
            }
            return item
        })
        setFiles((prev) => [...prev, ...newFileItems])
    }, [])

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            setIsDragOver(false)
            if (e.dataTransfer.files) {
                addFiles(e.dataTransfer.files)
            }
        },
        [addFiles],
    )

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
    }, [])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            addFiles(e.target.files)
        }
    }

    const removeFile = (id: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== id))
    }

  const handleUpload = async () => {
    const validFiles = files.filter((f) => f.status === "pending")
    if (validFiles.length === 0) return

    setIsUploading(true)
    setFiles((prev) =>
      prev.map((f) =>
        f.status === "pending" ? { ...f, status: "uploading", progress: 30 } : f
      )
    )

    try {
      // Envoyer tout le lot en une seule fois côté page parent.
      // Evite de naviguer dès le 1er fichier et d'interrompre le reste.
      await onUpload(validFiles.map((f) => f.file), selectedBank)
      // Nettoyer la zone upload dès que les fichiers sont bien enregistrés en backend.
      setFiles([])
    } catch (err) {
      setFiles((prev) =>
        prev.map((f) =>
          validFiles.some((vf) => vf.id === f.id)
            ? { ...f, status: "error", error: "Erreur lors de l'upload", progress: 0 }
            : f
        )
      )
    } finally {
      setIsUploading(false)
    }
  }

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return "0 B"
        const k = 1024
        const sizes = ["B", "KB", "MB", "GB"]
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    }

    const pendingCount = files.filter((f) => f.status === "pending").length

    return (
        <div className="space-y-3 animate-fade-in">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm w-full">

                <CardContent className="space-y-3">
                    {/* Bank Selection */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 bg-accent/30 p-3 sm:p-4 rounded-xl border border-border/50">
                        <div className="text-xs sm:text-sm w-full">
                                <p className="font-semibold">Structure de la banque</p>
                                <Select value={selectedBank} onValueChange={setSelectedBank}>
                            <SelectTrigger className="w-full bg-background text-xs sm:text-sm">
                                <SelectValue placeholder="Choisir une banque" />
                            </SelectTrigger>
                            <SelectContent>
                                {supportedBanks.map(bank => (
                                    <SelectItem key={bank.code} value={bank.code}>
                                        {bank.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                            </div>

                    </div>

                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        className={`relative flex min-h-[180px]  cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300 ${isDragOver
                            ? "border-primary bg-primary/5 scale-[1.01]"
                            : "border-border/50 hover:border-primary/50 hover:bg-accent/30"
                            }`}
                    >
                        <input
                            type="file"
                            accept=".pdf,.xlsx,.xls"
                            multiple
                            onChange={handleFileSelect}
                            className="absolute inset-0 cursor-pointer opacity-0"
                        />
                        <div className="flex flex-col items-center gap-3 sm:gap-4 text-center px-4 sm:px-6">
                            <div>
                                <p className="text-sm sm:text-lg font-medium text-foreground">Glissez vos relevés bancaires ici</p>
                            </div>

                        </div>
                    </div>

                    {files.length > 0 && (
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium text-foreground flex items-center gap-2 text-xs sm:text-sm">
                                    <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                                    Fichiers selectionnes ({files.length})
                                </h4>
                            </div>
                            <div className="space-y-2 sm:space-y-3">
                                {files.map((fileItem, index) => (
                                    <div
                                        key={fileItem.id}
                                        className="flex items-center gap-2 sm:gap-4 rounded-xl border border-border/50 bg-accent/30 p-2 sm:p-4 animate-slide-up"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <div className="flex h-10 w-10 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/50 overflow-hidden">
                                            <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="truncate font-medium text-foreground text-xs sm:text-sm">{fileItem.file.name}</p>
                                            <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-muted-foreground mt-0.5">
                                                <span>{formatFileSize(fileItem.file.size)}</span>
                                                <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
                                                <span className="uppercase">{fileItem.file.type.split("/")[1]}</span>
                                            </div>
                                            {fileItem.status === "uploading" && <Progress value={fileItem.progress} className="mt-2 h-1.5" />}
                                            {fileItem.error && <p className="mt-1 text-xs text-destructive">{fileItem.error}</p>}
                                        </div>

                                        <div className="shrink-0">
                                            {fileItem.status === "pending" && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeFile(fileItem.id)}
                                                    className="h-7 w-7 sm:h-9 sm:w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                >
                                                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                </Button>
                                            )}
                                            {fileItem.status === "uploading" && (
                                                <div className="h-7 w-7 sm:h-9 sm:w-9 flex items-center justify-center">
                                                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-primary" />
                                                </div>
                                            )}
                                            {fileItem.status === "success" && (
                                                <div className="h-7 w-7 sm:h-9 sm:w-9 flex items-center justify-center rounded-full bg-emerald-400/10">
                                                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                                                </div>
                                            )}
                                            {fileItem.status === "error" && (
                                                <div className="h-7 w-7 sm:h-9 sm:w-9 flex items-center justify-center rounded-full bg-destructive/10">
                                                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-border/50">
                                <Button
                                    variant="outline"
                                    onClick={() => setFiles([])}
                                    disabled={isUploading}
                                    className="bg-transparent border-border/50 text-xs sm:text-sm h-8 sm:h-9"
                                >
                                    Annuler
                                </Button>
                                <Button onClick={handleUpload} disabled={pendingCount === 0 || isUploading} className="gap-2 glow-sm text-xs sm:text-sm h-8 sm:h-9">
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                                            Upload en cours...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                            Uploader ({pendingCount})
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
