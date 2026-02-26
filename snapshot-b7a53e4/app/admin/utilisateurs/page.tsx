"use client"

import { useEffect, useMemo, useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { UserPlus, Users, Loader2, Building2, KeyRound } from "lucide-react"
import { toast } from "sonner"
import { ApiError } from "@/src/api/api-client"
import { AdminService, AdminFournisseurDto } from "@/src/api/services/admin.service"
import { ComptableAdminDto, UserRole } from "@/src/types"

type ManagedUser = {
    id: number
    email: string
    role: UserRole
    active: boolean
}

function AdminUsersPageContent() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [comptables, setComptables] = useState<ComptableAdminDto[]>([])
    const [fournisseurs, setFournisseurs] = useState<AdminFournisseurDto[]>([])
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null)
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isResettingPassword, setIsResettingPassword] = useState(false)

    const canSubmit = useMemo(() => {
        return !!email.trim() && !!password.trim() && !isSubmitting
    }, [email, password, isSubmitting])

    const onCreateComptable = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSubmit) return

        try {
            setIsSubmitting(true)
            const created = await AdminService.createComptable({
                email: email.trim(),
                password: password.trim(),
            })

            setComptables(prev => [created, ...prev])
            toast.success(`Comptable créé: ${created.email}`)
            setEmail("")
            setPassword("")
        } catch (err) {
            if (err instanceof ApiError) {
                if (err.code === "BUSINESS_ALREADY_EXISTS") {
                    toast.error("Cet email est déjà utilisé.")
                } else if (err.code === "BUSINESS_BAD_REQUEST") {
                    toast.error("Email ou mot de passe invalide.")
                } else {
                    toast.error(err.message || "Erreur lors de la création du comptable.")
                }
            } else {
                toast.error("Erreur inattendue lors de la création du comptable.")
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const [comptablesList, fournisseursList] = await Promise.all([
                    AdminService.listComptables(),
                    AdminService.listFournisseurs(),
                ])
                setComptables(comptablesList)
                setFournisseurs(fournisseursList)
            } finally {
                setIsLoading(false)
            }
        }
        loadUsers()
    }, [])

    const openPasswordDialog = (user: ManagedUser) => {
        setSelectedUser(user)
        setNewPassword("")
        setConfirmPassword("")
        setPasswordDialogOpen(true)
    }

    const handleResetPassword = async () => {
        if (!selectedUser) return
        if (newPassword.length < 6) {
            toast.error("Le mot de passe doit contenir au moins 6 caractères.")
            return
        }
        if (newPassword !== confirmPassword) {
            toast.error("La confirmation du mot de passe ne correspond pas.")
            return
        }

        try {
            setIsResettingPassword(true)
            await AdminService.resetPassword(selectedUser.email, newPassword)
            toast.success(`Mot de passe mis à jour pour ${selectedUser.email}`)
            setPasswordDialogOpen(false)
        } catch (err: any) {
            toast.error(err?.message || "Erreur lors de la mise à jour du mot de passe.")
        } finally {
            setIsResettingPassword(false)
        }
    }

    return (
        <div className="space-y-6">
            <Card className="border-border/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-primary" />
                        Ajouter un comptable
                    </CardTitle>
                    <CardDescription>
                        Créez un utilisateur avec le rôle COMPTABLE.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onCreateComptable} className="space-y-4 max-w-md">
                        <div className="space-y-2">
                            <Label htmlFor="comptable-email">Email</Label>
                            <Input
                                id="comptable-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="comptable@cabinet.ma"
                                disabled={isSubmitting}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="comptable-password">Mot de passe</Label>
                            <Input
                                id="comptable-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Comptable@123"
                                disabled={isSubmitting}
                                required
                            />
                        </div>

                        <Button type="submit" className="gap-2" disabled={!canSubmit}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Création...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="h-4 w-4" />
                                    Créer le comptable
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-border/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Liste des comptables
                    </CardTitle>
                    <CardDescription>
                        Gérer les comptes comptables.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground">Chargement...</p>
                    ) : comptables.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucun comptable créé pour le moment.</p>
                    ) : (
                        <div className="space-y-2">
                            {comptables.map((u) => (
                                <div key={u.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{u.email}</p>
                                        <p className="text-xs text-muted-foreground">ID: {u.id}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{u.role}</Badge>
                                        <Badge variant={u.active ? "default" : "secondary"}>
                                            {u.active ? "Actif" : "Inactif"}
                                        </Badge>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-1"
                                            onClick={() => openPasswordDialog(u)}
                                        >
                                            <KeyRound className="h-3.5 w-3.5" />
                                            Mot de passe
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-border/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        Liste des fournisseurs
                    </CardTitle>
                    <CardDescription>
                        Visualiser et gérer les comptes fournisseurs.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground">Chargement...</p>
                    ) : fournisseurs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucun fournisseur pour le moment.</p>
                    ) : (
                        <div className="space-y-2">
                            {fournisseurs.map((u) => (
                                <div key={u.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{u.email}</p>
                                        <p className="text-xs text-muted-foreground">ID: {u.id}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{u.role}</Badge>
                                        <Badge variant={u.active ? "default" : "secondary"}>
                                            {u.active ? "Actif" : "Inactif"}
                                        </Badge>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-1"
                                            onClick={() => openPasswordDialog({ ...u, role: "FOURNISSEUR" })}
                                        >
                                            <KeyRound className="h-3.5 w-3.5" />
                                            Mot de passe
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Changer le mot de passe</DialogTitle>
                        <DialogDescription>
                            {selectedUser ? `Utilisateur: ${selectedUser.email}` : "Sélectionnez un utilisateur."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">Nouveau mot de passe</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                minLength={6}
                                placeholder="Minimum 6 caractères"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleResetPassword} disabled={isResettingPassword}>
                            {isResettingPassword ? "Mise à jour..." : "Enregistrer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default function AdminUsersPage() {
    return (
        <AuthGuard allowedRoles={["SUPER_ADMIN"]}>
            <AdminUsersPageContent />
        </AuthGuard>
    )
}
