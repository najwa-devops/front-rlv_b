// ============================================
// TYPES GEOMETRIQUES
// ============================================

export interface FieldPosition {
  x: number
  y: number
  width: number
  height: number
  isEstimated?: boolean | undefined
}

// ============================================
// COMPTABILITE
// ============================================

export interface Account {
  id: number;
  code: string;
  libelle: string;
  classe: number;
  active: boolean;
  classeName?: string;
  tvaRate?: number;
  taxCode?: string;
  isFournisseurAccount?: boolean;
  isChargeAccount?: boolean;
  isTvaAccount?: boolean;
  displayWithTva?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAccountRequest {
  code: string;
  libelle: string;
  active?: boolean;
  tvaRate?: number;
  taxCode?: string;
}

export interface UpdateAccountRequest {
  libelle?: string;
  active?: boolean;
  tvaRate?: number;
  taxCode?: string;
}

// ============================================
// TIER (FOURNISSEUR)
// ============================================

// ============================================
// TYPES DIVERS
// ============================================

export interface SearchCriteria {
  [key: string]: string
}
