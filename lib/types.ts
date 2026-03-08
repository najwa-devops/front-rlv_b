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
  codejrn?: string;
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
// TYPES RELEVÉ BANCAIRE
// ============================================

export interface BankStatementField {
  key: string
  label: string
  value: string | number | null
  type: "text" | "number" | "date"
  position?: FieldPosition | undefined
}

export interface LocalBankStatement {
  id: number
  filename: string
  originalName?: string | undefined
  filePath: string
  fileSize: number
  fileUrl?: string | undefined
  fields: BankStatementField[]
  status: "pending" | "processing" | "treated" | "validated" | "error"
  isProcessing?: boolean | undefined
  createdAt: Date
  updatedAt?: Date | undefined
  rawOcrText?: string
  cleanedOcrText?: string
}

export interface BankOption {
  code: string
  label: string
  mappedTo: string
}

export type BankStatementV2Status =
  | "PENDING"
  | "PROCESSING"
  | "TREATED"
  | "READY_TO_VALIDATE"
  | "VALIDATED"
  | "COMPTABILISE"
  | "ERROR"
  | "PARTIAL_SUCCESS"
  | "EN_ATTENTE"
  | "EN_COURS"
  | "TRAITE"
  | "PRET_A_VALIDER"
  | "VALIDE"
  | "COMPTABILISÉ"
  | "ERREUR"
  | "VIDE"
  | "DUPLIQUE"

export type ContinuityStatus =
  | "CONSISTENT"
  | "MISSING_PREVIOUS"
  | "INCONSISTENT_BALANCE"
  | "FIRST_STATEMENT"
  | "WARNING"
  | "NONE"

export interface BankTransactionPreview {
  id: number
  date: string
  libelle: string
  debit: number
  credit: number
  compte?: string
  codejrn?: string
  isLinked?: boolean
  transactionIndex?: number
  sens?: "DEBIT" | "CREDIT"
  isValid?: boolean
}

export interface BankStatementV2 {
  id: number
  filename: string
  originalName: string
  fileUrl?: string
  status: BankStatementV2Status
  rib: string
  month: number
  year: number
  bankName: string
  openingBalance: number
  closingBalance: number
  totalCredit: number
  totalDebit: number
  transactionCount: number
  validTransactionCount: number
  errorTransactionCount: number
  overallConfidence: number
  continuityStatus: ContinuityStatus
  isBalanceValid: boolean
  isContinuityValid: boolean
  applyTtcRule?: boolean
  isLinked?: boolean
  createdAt: string
  updatedAt: string
  totalPages?: number
  processedPages?: number
  errorPagesCount?: number
  pageDetails?: Record<string, string>
  accountHolder?: string
  balanceDifference?: number
  validationErrors?: string[] | null
  rawOcrText?: string
  cleanedOcrText?: string
  filePath?: string
  fileSize?: number
  validatedAt?: string | null
  validatedBy?: string | null
  accountedAt?: string | null
  accountedBy?: string | null
  transactionsPreview?: BankTransactionPreview[]
  canReprocess?: boolean
  canDelete?: boolean
  transactions?: BankTransactionV2[]
}

export interface BankTransactionV2 {
  id: number
  statementId: number
  dateOperation: string
  dateValeur: string
  libelle: string
  rib: string | null
  debit: number
  credit: number
  sens: "DEBIT" | "CREDIT"
  compte: string
  compteLibelle?: string | null
  codejrn?: string | null
  isLinked: boolean
  categorie: string
  role: string
  extractionConfidence: number
  isValid: boolean
  needsReview: boolean
  reviewNotes: string | null
  extractionErrors: string[] | null
  lineNumber: number
  transactionIndex?: number
}

// ============================================
// TYPES DIVERS
// ============================================

export interface SearchCriteria {
  [key: string]: string
}

// ============================================
// TYPES CENTRE MONETIQUE
// ============================================

export interface CentreMonetiqueExtractionRow {
  section: string
  date: string
  reference: string
  montant: string
  debit: string
  credit: string
  dc?: string
}

export interface CentreMonetiqueBatchSummary {
  id: number
  filename: string
  originalName: string
  status: string
  structure: "AUTO" | "CMI" | "BARID_BANK" | string
  statementPeriod: string
  totalTransactions: string
  totalMontant: string
  totalCommissionHt: string
  totalTvaSurCommissions: string
  soldeNetRemise: string
  totalDebit: string
  totalCredit: string
  transactionCount: number
  createdAt: string
  updatedAt: string
  errorMessage: string
}

export interface CentreMonetiqueBatchDetail extends CentreMonetiqueBatchSummary {
  fileContentType: string
  fileSize: number
  rawOcrText?: string | null
  rows: CentreMonetiqueExtractionRow[]
}

export interface CentreMonetiqueUploadResponse {
  message: string
  batch: CentreMonetiqueBatchDetail
  rows: CentreMonetiqueExtractionRow[]
}
