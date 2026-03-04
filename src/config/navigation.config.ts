import {
    Building2,
    List,
    ChevronLeft
} from "lucide-react";
import { UserRole } from "@/src/types";

export interface NavItemConfig {
    id: string;
    href: string;
    label: string;
    icon: any;
    roles?: UserRole[];
    badgeKey?: string;
    children?: NavItemConfig[] | undefined;
}

// Navigation globale: Banking uniquement
export const GLOBAL_NAV_CONFIG: Record<UserRole, NavItemConfig[]> = {
    SUPER_ADMIN: [
        {
            id: "bank",
            href: "#",
            label: "Banque",
            icon: Building2,
            children: [
                { id: "bank-list", href: "/bank/list", label: "Liste des relevés", icon: List, badgeKey: "pendingCount" },
            ]
        }
    ],
    COMPTABLE: [
        {
            id: "bank",
            href: "#",
            label: "Banque",
            icon: Building2,
            children: [
                { id: "bank-list", href: "/bank/list", label: "Liste des relevés", icon: List, badgeKey: "pendingCount" },
            ]
        }
    ],
    FOURNISSEUR: [
        {
            id: "bank",
            href: "#",
            label: "Banque",
            icon: Building2,
            children: [
                { id: "bank-list", href: "/bank/list", label: "Liste des relevés", icon: List, badgeKey: "pendingCount" },
            ]
        }
    ]
};

// Navigation contextuelle dossier: Banking uniquement
export const getDossierNavConfig = (_dossierId: string | number): NavItemConfig[] => [
    { id: "back", href: "/bank/list", label: "Retour banque", icon: ChevronLeft, roles: ["COMPTABLE", "SUPER_ADMIN", "FOURNISSEUR"] },
    {
        id: "bank",
        href: "#",
        label: "Banque",
        icon: Building2,
        roles: ["COMPTABLE", "SUPER_ADMIN", "FOURNISSEUR"],
        children: [
            { id: "bank-list", href: "/bank/list", label: "Liste des relevés", icon: List, badgeKey: "pendingCount", roles: ["COMPTABLE", "SUPER_ADMIN", "FOURNISSEUR"] },
        ]
    },
];

export const ROUTE_METADATA: Record<string, { title: string; breadcrumb?: string }> = {
    "/login": { title: "Connexion", breadcrumb: "Connexion" },
    "/bank/ocr": { title: "Détails du relevé", breadcrumb: "OCR" },
};

export const getRouteMetadata = (pathname: string) => {
    if (ROUTE_METADATA[pathname]) return ROUTE_METADATA[pathname];

    const sortedRoutes = Object.keys(ROUTE_METADATA).sort((a, b) => b.length - a.length);
    for (const route of sortedRoutes) {
        if (pathname.startsWith(route)) return ROUTE_METADATA[route];
    }

    return { title: "Banque", breadcrumb: "Banque" };
};
