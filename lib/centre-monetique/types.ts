export interface CentreMonetiqueExtractionRow {
  section: string
  date: string
  reference: string
  montant: string
  debit: string
  credit: string
  dc: string
  compteComptable?: string
}

export interface CentreMonetiqueBatchSummary {
  id: number
  filename: string
  originalName?: string
  rib?: string
  status: string
  structure: "AUTO" | "CMI" | "BARID_BANK" | string
  statementPeriod?: string
  totalTransactions?: string
  totalMontant?: string
  totalCommissionHt?: string
  totalTvaSurCommissions?: string
  soldeNetRemise?: string
  totalDebit?: string
  totalCredit?: string
  month?: number
  year?: number
  transactionCount: number
  confidence?: number
  processingTimeMs?: number
  error?: string
  errorMessage?: string
  createdAt: string
  updatedAt?: string
}

export interface CentreMonetiqueBatchDetail extends CentreMonetiqueBatchSummary {
  rawOcrText?: string
  cleanedOcrText?: string
  rows: CentreMonetiqueExtractionRow[]
}

export interface RapprochementMatch {
  date: string
  cmReference: string
  cmMontant: string
  cmStan: string
  cmType: string
  cmMontantTransaction: string
  bankStatementName: string
  bankMontant: string
  bankLibelle: string
}

export interface RapprochementResult {
  batchId: number
  batchRib: string
  totalCmTransactions: number
  matchedCount: number
  matches: RapprochementMatch[]
}

export interface CentreMonetiqueUploadResponse {
  success: boolean
  batch: CentreMonetiqueBatchDetail
  rows: CentreMonetiqueExtractionRow[]
  error?: string
  message?: string
}
