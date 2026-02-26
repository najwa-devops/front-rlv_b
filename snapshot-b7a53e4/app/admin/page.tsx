"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Users, FolderOpen, FileText, Search, ChevronRight, UserPlus, Building2, Clock,
    BarChart3, ShieldCheck, RefreshCw
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { AdminService, AdminDossierDto, AdminFournisseurDto } from "@/src/api/services/admin.service"
import { ComptableAdminDto } from "@/src/types"

type DossierRow = {
    id: number
    name: string
    comptableId: number
    comptableName: string
    fournisseurName: string
    invoicesCount: number
    pendingInvoicesCount: number
}

function initialsFromEmail(email: string): string {
    const prefix = email.split("@")[0] || "U"
    return prefix.slice(0, 2).toUpperCase()
}

function AdminPageContent() {
    const router = useRouter()
    const [search, setSearch] = useState("")
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<any>(null)
    const [comptables, setComptables] = useState<ComptableAdminDto[]>([])
    const [dossiers, setDossiers] = useState<DossierRow[]>([])
    const [fournisseurs, setFournisseurs] = useState<AdminFournisseurDto[]>([])
    const [assignDialogOpen, setAssignDialogOpen] = useState(false)
    const [selectedDossier, setSelectedDossier] = useState<DossierRow | null>(null)
    const [selectedComptableId, setSelectedComptableId] = useState<string>("")
    const [isAssigning, setIsAssigning] = useState(false)

    const loadData = async () => {
        try {
            const [statsData, dossiersData, comptablesData, fournisseursData] = await Promise.all([
                api.getDynamicInvoiceStats().catch(() => null),
                AdminService.listDossiers().catch(() => []),
                AdminService.listComptables().catch(() => []),
                AdminService.listFournisseurs().catch(() => []),
            ])

            const mappedDossiers: DossierRow[] = (dossiersData || []).map((d: AdminDossierDto) => ({
                id: d.id,
                name: d.name,
                comptableId: d.comptableId ?? 0,
                comptableName: d.comptableEmail || "N/A",
                fournisseurName: d.fournisseurEmail || "N/A",
                invoicesCount: d.invoicesCount ?? 0,
                pendingInvoicesCount: d.pendingInvoicesCount ?? 0,
            }))

            setStats(statsData)
            setDossiers(mappedDossiers)
            setComptables(comptablesData || [])
            setFournisseurs(fournisseursData || [])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const openAssignDialog = (dossier: DossierRow) => {
        setSelectedDossier(dossier)
        setSelectedComptableId(String(dossier.comptableId || ""))
        setAssignDialogOpen(true)
    }

    const handleReassignDossier = async () => {
        if (!selectedDossier || !selectedComptableId) return
        try {
            setIsAssigning(true)
            await AdminService.reassignDossierComptable(selectedDossier.id, Number(selectedComptableId))
            setAssignDialogOpen(false)
            await loadData()
            toast.success(`Dossier "${selectedDossier.name}" réaffecté avec succès.`)
        } catch (error: any) {
            toast.error(error?.message || "Réaffectation impossible. Vérifiez l'endpoint backend de réaffectation.")
        } finally {
            setIsAssigning(false)
        }
    }

    const comptablesById = useMemo(() => {
        const map = new Map<number, { dossiers: number; invoices: number; pending: number }>()
        for (const d of dossiers) {
            if (!map.has(d.comptableId)) {
                map.set(d.comptableId, { dossiers: 0, invoices: 0, pending: 0 })
            }
            const agg = map.get(d.comptableId)!
            agg.dossiers += 1
            agg.invoices += d.invoicesCount
            agg.pending += d.pendingInvoicesCount
        }
        return map
    }, [dossiers])

    const filteredComptables = useMemo(() => {
        const term = search.trim().toLowerCase()
        if (!term) return comptables
        return comptables.filter((c) => c.email.toLowerCase().includes(term))
    }, [comptables, search])

    const filteredDossiers = useMemo(() => {
        const term = search.trim().toLowerCase()
        if (!term) return dossiers
        return dossiers.filter((d) =>
            d.name.toLowerCase().includes(term) ||
            d.fournisseurName.toLowerCase().includes(term) ||
            d.comptableName.toLowerCase().includes(term)
        )
    }, [dossiers, search])

    const uniqueFournisseurs = useMemo(() => {
        if (fournisseurs.length > 0) return fournisseurs.length
        return new Set(dossiers.map((d) => d.fournisseurName)).size
    }, [dossiers, fournisseurs])

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Comptables", value: comptables.length, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { label: "Fournisseurs", value: uniqueFournisseurs, icon: Building2, color: "text-purple-500", bg: "bg-purple-500/10" },
                    { label: "Dossiers", value: dossiers.length, icon: FolderOpen, color: "text-indigo-500", bg: "bg-indigo-500/10" },
                    { label: "Factures totales", value: stats?.total ?? 0, icon: FileText, color: "text-orange-500", bg: "bg-orange-500/10" },
                ].map(stat => (
                    <Card key={stat.label} className="border-border/50">
                        <CardContent className="pt-4 pb-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${stat.bg}`}>
                                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{loading ? "..." : stat.value}</p>
                                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-border/50">
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">En attente</p>
                                <p className="text-3xl font-bold text-amber-500">{loading ? "..." : (stats?.verify ?? 0) + (stats?.readyToTreat ?? 0) + (stats?.readyToValidate ?? 0)}</p>
                                <p className="text-xs text-muted-foreground">factures à traiter</p>
                            </div>
                            <div className="p-3 rounded-full bg-amber-500/10">
                                <Clock className="h-6 w-6 text-amber-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/50">
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Validées</p>
                                <p className="text-3xl font-bold">{loading ? "..." : stats?.validated ?? 0}</p>
                                <p className="text-xs text-muted-foreground">factures</p>
                            </div>
                            <div className="p-3 rounded-full bg-primary/10">
                                <FileText className="h-6 w-6 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="comptables">
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="comptables" className="gap-2">
                            <Users className="h-4 w-4" />
                            Comptables ({filteredComptables.length})
                        </TabsTrigger>
                        <TabsTrigger value="dossiers" className="gap-2">
                            <FolderOpen className="h-4 w-4" />
                            Tous les dossiers ({filteredDossiers.length})
                        </TabsTrigger>
                    </TabsList>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher..."
                                className="pl-9 w-56"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <Button className="gap-2" onClick={() => router.push("/admin/utilisateurs")}>
                            <UserPlus className="h-4 w-4" />
                            Nouveau Comptable
                        </Button>
                    </div>
                </div>

                <TabsContent value="comptables">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredComptables.map(comptable => {
                            const agg = comptablesById.get(comptable.id) || { dossiers: 0, invoices: 0, pending: 0 }
                            return (
                                <Card
                                    key={comptable.id}
                                    className="border-border/50 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group"
                                    onClick={() => router.push(`/admin/comptables/${comptable.id}`)}
                                >
                                    <CardContent className="py-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                                                    {initialsFromEmail(comptable.email)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold">{comptable.email.split("@")[0]}</p>
                                                    <p className="text-xs text-muted-foreground">{comptable.email}</p>
                                                </div>
                                            </div>
                                            <Badge variant={comptable.active ? "default" : "secondary"} className="text-xs">
                                                {comptable.active ? "Actif" : "Inactif"}
                                            </Badge>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center mt-3">
                                            <div className="rounded-lg bg-muted/50 py-2">
                                                <p className="text-lg font-bold">{agg.dossiers}</p>
                                                <p className="text-[10px] text-muted-foreground">Dossiers</p>
                                            </div>
                                            <div className="rounded-lg bg-muted/50 py-2">
                                                <p className="text-lg font-bold">{agg.pending}</p>
                                                <p className="text-[10px] text-muted-foreground">En attente</p>
                                            </div>
                                            <div className="rounded-lg bg-muted/50 py-2">
                                                <p className="text-lg font-bold">{agg.invoices}</p>
                                                <p className="text-[10px] text-muted-foreground">Factures</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-end mt-2">
                                            <ChevronRight className="h-4 w-4 group-hover:text-primary transition-colors" />
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </TabsContent>

                <TabsContent value="dossiers">
                    <div className="space-y-2">
                        {filteredDossiers.map(dossier => (
                            <Card
                                key={dossier.id}
                                className="border-border/50 hover:border-border cursor-pointer"
                                onClick={() => router.push(`/dossiers/${dossier.id}`)}
                            >
                                <CardContent className="py-3 px-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                                            <div className="min-w-0">
                                                <p className="font-medium text-sm truncate">{dossier.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {dossier.fournisseurName} · Comptable : {dossier.comptableName}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-xs text-muted-foreground">{dossier.invoicesCount} factures</span>
                                            {dossier.pendingInvoicesCount > 0 && (
                                                <Badge className="bg-amber-500 text-white text-xs border-none">
                                                    {dossier.pendingInvoicesCount} en attente
                                                </Badge>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-1 bg-transparent"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    openAssignDialog(dossier)
                                                }}
                                            >
                                                <RefreshCw className="h-3.5 w-3.5" />
                                                Réaffecter
                                            </Button>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: "Statistiques détaillées", desc: "Graphiques et KPIs", icon: BarChart3, href: "/admin/statistiques" },
                    { label: "Journal d'audit", desc: "Traçabilité des actions", icon: ShieldCheck, href: "/admin/audit" },
                    { label: "Gestion des utilisateurs", desc: "Créer et gérer les comptes", icon: Users, href: "/admin/utilisateurs" },
                ].map(link => (
                    <Card
                        key={link.href}
                        className="border-border/50 hover:border-primary/40 cursor-pointer hover:shadow-md transition-all group"
                        onClick={() => router.push(link.href)}
                    >
                        <CardContent className="pt-4 pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                    <link.icon className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm">{link.label}</p>
                                    <p className="text-xs text-muted-foreground">{link.desc}</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Réaffecter un dossier</DialogTitle>
                        <DialogDescription>
                            {selectedDossier ? `Dossier: ${selectedDossier.name}` : "Sélectionnez un dossier."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nouveau comptable</label>
                        <Select value={selectedComptableId} onValueChange={setSelectedComptableId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionnez un comptable" />
                            </SelectTrigger>
                            <SelectContent>
                                {comptables.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        {c.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleReassignDossier} disabled={!selectedComptableId || isAssigning}>
                            {isAssigning ? "Réaffectation..." : "Confirmer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default function AdminPage() {
    return (
        <AuthGuard allowedRoles={["SUPER_ADMIN"]}>
            <AdminPageContent />
        </AuthGuard>
    )
}
