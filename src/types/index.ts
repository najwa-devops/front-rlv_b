// ============================================
// API RESPONSE TYPES (V2)
// ============================================

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: string;
    code?: string;
    errorCode?: string;
    details?: unknown;
    timestamp: string;
}

export type UserRole = "SUPER_ADMIN" | "COMPTABLE" | "FOURNISSEUR";

export interface User {
    id: number;
    email: string;
    name: string;
    role: UserRole;
    active: boolean;
    password?: string;
}

export interface LoginResponse {
    token: string;
    user: User;
}

export interface LoginRequest {
    email: string;
    password?: string;
}

export interface CreateComptableRequest {
    email: string;
    password: string;
}

export interface ComptableAdminDto {
    id: number;
    email: string;
    role: "COMPTABLE";
    active: boolean;
}

// ============================================
// GEOMETRIC TYPES
// ============================================

export interface FieldPosition {
    x: number;
    y: number;
    width: number;
    height: number;
    isEstimated?: boolean;
}

// ============================================
// ACCOUNTING TYPES
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
// BANK STATEMENT TYPES
// ============================================

export interface BankStatementField {
    key: string;
    label: string;
    value: string | number | null;
    type: "text" | "number" | "date";
    position?: FieldPosition;
}

export interface LocalBankStatement {
    id: number;
    filename: string;
    originalName?: string;
    filePath: string;
    fileSize: number;
    fileUrl?: string;
    fields: BankStatementField[];
    status: "pending" | "processing" | "treated" | "validated" | "error";
    isProcessing?: boolean;
    createdAt: string;
    updatedAt?: string;
}
