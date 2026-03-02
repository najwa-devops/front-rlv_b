import {
  Account,
  CreateAccountRequest,
  UpdateAccountRequest,
  Tier,
  CreateTierRequest,
  UpdateTierRequest,
  BankStatementV2,
  BankTransactionV2,
  BankStatementStats,
  BankOption
} from "./types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8096"

type ApiEnvelope<T> = {
  success: boolean
  data: T
  error?: string
  code?: string
  details?: unknown
  timestamp?: string
}

export type AccountingConfigDto = {
  id: number
  journal: string
  designation: string
  banque: string
  compteComptable: string
  rib: string
  ttcEnabled?: boolean
}

export type UpsertAccountingConfigRequest = Omit<AccountingConfigDto, "id">

async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token")
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`)
    }
  }

  const response = await fetch(input, { ...init, headers })

  if (!response.ok) return response

  const contentType = response.headers.get("content-type") || ""
  if (!contentType.includes("application/json")) return response

  try {
    const body = await response.clone().json() as ApiEnvelope<unknown> | unknown
    if (body && typeof body === "object" && "success" in (body as Record<string, unknown>) && "data" in (body as Record<string, unknown>)) {
      const envelope = body as ApiEnvelope<unknown>
      if (envelope.success) {
        return new Response(JSON.stringify(envelope.data), {
          status: response.status,
          statusText: response.statusText,
          headers: { "Content-Type": "application/json" },
        })
      }
      return new Response(JSON.stringify(envelope), {
        status: response.status >= 400 ? response.status : 400,
        statusText: "Business Error",
        headers: { "Content-Type": "application/json" },
      })
    }
  } catch {
    return response
  }

  return response
}

// ============================================
// HELPERS
// ============================================

export function normalizeStatus(status: any): string {
  if (!status) return "pending"
  const s = String(status).toUpperCase()
  if (s === "VERIFY" || s === "TO_VERIFY") return "to_verify"
  if (s === "READY_TO_TREAT" || s === "PENDING") return "pending"
  if (s === "PROCESSING") return "processing"
  if (s === "TREATED" || s === "PROCESSED") return "treated"
  if (s === "READY_TO_VALIDATE") return "ready_to_validate"
  if (s === "VALIDATED") return "validated"
  if (s === "REJECTED" || s === "ERROR") return "error"
  return "pending"
}

export async function parseApiError(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type")
  const fallback = `HTTP ${response.status} ${response.statusText || ""}`.trim()
  try {
    if (contentType && contentType.includes("application/json")) {
      const errorData = await response.json() as any
      const code = errorData.code || errorData.errorCode
      const message = errorData.error || errorData.message || fallback
      return code ? `${message} (${code})` : message
    } else {
      const text = await response.text()
      if (text.includes("<html>")) {
        const match = text.match(/<title>(.*?)<\/title>/i)
        return match ? `Server Error: ${match[1]}` : `Server Error (HTML response)`
      }
      return text || fallback
    }
  } catch {
    return fallback
  }
}

// ============================================
// ACCOUNTING: ACCOUNTS
// ============================================

export async function getAccounts(activeOnly: boolean = true): Promise<Account[]> {
  const response = await apiFetch(`${API_BASE_URL}/api/accounting/accounts?activeOnly=${activeOnly}`)
  if (!response.ok) throw new Error(await parseApiError(response))
  const data = await response.json()
  return data.accounts || []
}

export async function getAccountById(id: number): Promise<Account> {
  const response = await apiFetch(`${API_BASE_URL}/api/accounting/accounts/${id}`)
  if (!response.ok) throw new Error(await parseApiError(response))
  const data = await response.json()
  return data.account
}

export async function getAccountByCode(code: string): Promise<Account | null> {
  const response = await apiFetch(`${API_BASE_URL}/api/accounting/accounts/by-code/${code}`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error(await parseApiError(response))
  const data = await response.json()
  return data.account
}

export async function searchAccounts(query: string): Promise<Account[]> {
  const response = await apiFetch(`${API_BASE_URL}/api/accounting/accounts/search?query=${encodeURIComponent(query)}`)
  if (!response.ok) throw new Error(await parseApiError(response))
  const data = await response.json()
  return data.accounts || []
}

export async function getAccountsByClasse(classe: number): Promise<Account[]> {
  const response = await apiFetch(`${API_BASE_URL}/api/accounting/accounts/by-classe/${classe}`)
  if (!response.ok) throw new Error(await parseApiError(response))
  const data = await response.json()
  return data.accounts || []
}

export async function getChargeAccounts(): Promise<Account[]> {
  const accounts = await getAccounts(true)
  return accounts.filter(a => a.isChargeAccount || a.classe === 6 || a.code.startsWith("6"))
}

export async function getTvaAccounts(): Promise<Account[]> {
  const accounts = await getAccounts(true)
  return accounts.filter(a => a.isTvaAccount || a.classe === 3 || a.classe === 4 || a.code.startsWith("3455") || a.code.startsWith("4455"))
}

export async function getFournisseurAccounts(): Promise<Account[]> {
  const accounts = await getAccounts(true)
  return accounts.filter(a => a.isFournisseurAccount || a.code.startsWith("4411"))
}

export async function createAccount(request: CreateAccountRequest): Promise<Account> {
  const response = await apiFetch(`${API_BASE_URL}/api/accounting/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })
  if (!response.ok) throw new Error(await parseApiError(response))
  const data = await response.json()
  return data.account
}

export async function updateAccount(id: number, request: UpdateAccountRequest): Promise<Account> {
  const response = await apiFetch(`${API_BASE_URL}/api/accounting/accounts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })
  if (!response.ok) throw new Error(await parseApiError(response))
  const data = await response.json()
  return data.account
}

export async function deactivateAccount(id: number): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/api/accounting/accounts/${id}`, { method: "DELETE" })
  if (!response.ok) throw new Error(await parseApiError(response))
}

export async function activateAccount(id: number): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/api/accounting/accounts/${id}/activate`, { method: "PATCH" })
  if (!response.ok) throw new Error(await parseApiError(response))
}

export async function importAccounts(requests: CreateAccountRequest[]): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/accounting/accounts/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requests),
  })
  if (!response.ok) throw new Error(await parseApiError(response))
  return response.json()
}

// ============================================
// ACCOUNTING: TIERS
// ============================================

export async function getAllTiers(activeOnly: boolean = true): Promise<Tier[]> {
  const response = await apiFetch(`${API_BASE_URL}/api/accounting/tiers?activeOnly=${activeOnly}`)
  if (!response.ok) throw new Error(await parseApiError(response))
  const data = await response.json()
  return data.tiers || []
}

export async function getTierById(id: number): Promise<Tier> {
  const response = await apiFetch(`${API_BASE_URL}/api/accounting/tiers/${id}`)
  if (!response.ok) throw new Error(await parseApiError(response))
  const data = await response.json()
  return data.tier
}

export async function getTierByTierNumber(tierNumber: string): Promise<Tier | null> {
  const response = await apiFetch(`${API_BASE_URL}/api/accounting/tiers/by-tier-number/${tierNumber}`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error(await parseApiError(response))
  const data = await response.json()
  return data.tier
}

export async function getTierByIce(ice: string): Promise<Tier | null> {
  const response = await apiFetch(`${API_BASE_URL}/api/accounting/tiers/search?query=${encodeURIComponent(ice)}`)
  if (!response.ok) throw new Error(await parseApiError(response))
  const data = await response.json()
  const tiers: Tier[] = data.tiers || []
  const normalized = String(ice || "").replace(/\s+/g, "")
  const exact = tiers.find((t) => String(t.ice || "").replace(/\s+/g, "") === normalized)
  return exact || null
}

export async function getTierByIfNumber(ifNumber: string): Promise<Tier | null> {
  const response = await apiFetch(`${API_BASE_URL}/api/accounting/tiers/search?query=${encodeURIComponent(ifNumber)}`)
  if (!response.ok) throw new Error(await parseApiError(response))
  const data = await response.json()
  const tiers: Tier[] = data.tiers || []
  const normalized = String(ifNumber || "").replace(/\s+/g, "")
  const exact = tiers.find((t) => String(t.ifNumber || "").replace(/\s+/g, "") === normalized)
  return exact || null
}

export async function searchTiers(query: string): Promise<Tier[]> {
  const response = await apiFetch(`${API_BASE_URL}/api/accounting/tiers/search?query=${encodeURIComponent(query)}`)
  if (!response.ok) throw new Error(await parseApiError(response))
  const data = await response.json()
  return data.tiers || []
}

export async function createTier(request: CreateTierRequest): Promise<Tier> {
  const response = await apiFetch(`${API_BASE_URL}/api/accounting/tiers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })
  if (!response.ok) throw new Error(await parseApiError(response))
  const data = await response.json()
  return data.tier
}

export async function updateTier(id: number, request: UpdateTierRequest): Promise<Tier> {
  const response = await apiFetch(`${API_BASE_URL}/api/accounting/tiers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })
  if (!response.ok) throw new Error(await parseApiError(response))
  const data = await response.json()
  return data.tier
}

export async function deactivateTier(id: number): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/api/accounting/tiers/${id}`, { method: "DELETE" })
  if (!response.ok) throw new Error(await parseApiError(response))
}

export async function activateTier(id: number): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/api/accounting/tiers/${id}/activate`, { method: "PATCH" })
  if (!response.ok) throw new Error(await parseApiError(response))
}

// ============================================
// ACCOUNTING CONFIGS API
// ============================================

export async function getAccountingConfigs(): Promise<AccountingConfigDto[]> {
  const response = await apiFetch(`${API_BASE_URL}/api/v2/accounting-configs`)
  if (!response.ok) throw new Error(await parseApiError(response))
  const data = await response.json()
  return data.configs || data || []
}

export async function createAccountingConfig(request: UpsertAccountingConfigRequest): Promise<AccountingConfigDto> {
  const response = await apiFetch(`${API_BASE_URL}/api/v2/accounting-configs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })
  if (!response.ok) throw new Error(await parseApiError(response))
  return response.json()
}

export async function updateAccountingConfig(id: number, request: UpsertAccountingConfigRequest): Promise<AccountingConfigDto> {
  const response = await apiFetch(`${API_BASE_URL}/api/v2/accounting-configs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })
  if (!response.ok) throw new Error(await parseApiError(response))
  return response.json()
}

export async function deleteAccountingConfig(id: number): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/api/v2/accounting-configs/${id}`, {
    method: "DELETE",
  })
  if (!response.ok) throw new Error(await parseApiError(response))
}

export async function getAccountingConfigBanks(): Promise<string[]> {
  const response = await apiFetch(`${API_BASE_URL}/api/v2/accounting-configs/banks`)
  if (!response.ok) throw new Error(await parseApiError(response))
  const data = await response.json()
  return data.banks || []
}

export async function generateAccountingFromXmlUrl(xmlUrl: string, nmois: number, year?: number): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/v2/accounting/generate-from-xml-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ xmlUrl, nmois, year }),
  })
  if (!response.ok) throw new Error(await parseApiError(response))
  return response.json()
}


export async function simulateComptabilisation(statementId: number): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/comptabilisation/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ statementId }),
  })
  if (!response.ok) throw new Error(await parseApiError(response))
  return response.json()
}

export async function confirmComptabilisation(simulationId: string, userId?: string): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/comptabilisation/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ simulationId, userId, confirmed: true }),
  })
  if (!response.ok) throw new Error(await parseApiError(response))
  return response.json()
}

// ============================================
// BANK STATEMENTS API
// ============================================

export async function uploadBankStatement(file: File, bankType?: string, allowedBanks?: string[]): Promise<BankStatementV2> {
  const formData = new FormData()
  formData.append("file", file)
  if (bankType && bankType !== "AUTO") {
    formData.append("bankType", bankType)
  }
  if (allowedBanks && allowedBanks.length > 0) {
    allowedBanks.forEach((bank) => formData.append("allowedBanks", bank))
  }

  const response = await apiFetch(`${API_BASE_URL}/api/v2/bank-statements/upload`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) throw new Error(await parseApiError(response))
  return response.json()
}

export async function processBankStatement(id: number, allowedBanks?: string[]): Promise<BankStatementV2> {
  const query = new URLSearchParams()
  if (allowedBanks && allowedBanks.length > 0) {
    query.append("allowedBanks", allowedBanks.join(","))
  }
  const url = query.toString()
    ? `${API_BASE_URL}/api/v2/bank-statements/${id}/process?${query.toString()}`
    : `${API_BASE_URL}/api/v2/bank-statements/${id}/process`

  const response = await apiFetch(url, { method: "POST" })
  if (!response.ok) throw new Error(await parseApiError(response))
  return response.json()
}

export async function getAllBankStatements(
  queryParams?: string | { status?: string; rib?: string; month?: number; year?: number; limit?: number }
): Promise<BankStatementV2[]> {
  const qs = new URLSearchParams()
  if (typeof queryParams === "string") {
    qs.append("status", queryParams)
  } else if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) qs.append(key, String(value))
    })
  }
  if (!qs.has("limit")) qs.append("limit", "1000")
  qs.append("_t", String(Date.now()))

  const url = `${API_BASE_URL}/api/v2/bank-statements?${qs.toString()}`
  const response = await apiFetch(url, {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  })
  if (!response.ok) throw new Error(await parseApiError(response))
  const data = await response.json()
  return data.statements || data || []
}

export async function getBankStatementById(id: number): Promise<BankStatementV2> {
  const response = await apiFetch(`${API_BASE_URL}/api/v2/bank-statements/${id}`)
  if (!response.ok) throw new Error(await parseApiError(response))
  return response.json()
}

export async function validateBankStatement(id: number, fields?: any): Promise<BankStatementV2> {
  const init: RequestInit = { method: "POST" }
  if (fields !== undefined && fields !== null) {
    init.headers = { "Content-Type": "application/json" }
    init.body = JSON.stringify(fields)
  }

  const response = await apiFetch(`${API_BASE_URL}/api/v2/bank-statements/${id}/validate`, init)
  if (!response.ok) throw new Error(await parseApiError(response))
  return response.json()
}

export async function updateBankStatementStatus(
  id: number,
  status: string,
  updatedBy?: string
): Promise<BankStatementV2> {
  const response = await apiFetch(`${API_BASE_URL}/api/v2/bank-statements/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, updatedBy }),
  })
  if (!response.ok) throw new Error(await parseApiError(response))
  const data = await response.json()
  return data.statement || data
}

export async function updateBankStatementTtcRule(
  id: number,
  enabled: boolean,
  reprocess: boolean = true
): Promise<BankStatementV2> {
  const payload = JSON.stringify({ enabled, reprocess })

  let response = await apiFetch(`${API_BASE_URL}/api/v2/bank-statements/${id}/ttc-rule`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: payload,
  })

  if (!response.ok && response.status === 404) {
    response = await apiFetch(`${API_BASE_URL}/api/bank-statements/${id}/ttc-rule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: payload,
    })
  }

  if (!response.ok) throw new Error(await parseApiError(response))
  const data = await response.json()
  return data.statement || data
}

export async function deleteBankStatement(id: number): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/api/v2/bank-statements/${id}`, { method: "DELETE" })
  if (!response.ok) throw new Error(await parseApiError(response))
}

export async function deleteAllBankStatements(): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/api/v2/bank-statements/all`, { method: "DELETE" })
  if (!response.ok) throw new Error(await parseApiError(response))
}

export async function getBankStatementStats(): Promise<BankStatementStats> {
  const response = await apiFetch(`${API_BASE_URL}/api/v2/bank-statements/stats?_t=${Date.now()}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
  })
  if (!response.ok) throw new Error(await parseApiError(response))
  return response.json()
}

export async function retryFailedBankStatementPages(id: number): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/v2/bank-statements/${id}/retry-failed`, { method: "POST" })
  if (!response.ok) throw new Error(await parseApiError(response))
  return response.json()
}

export async function getBankOptions(): Promise<{ count: number; options: BankOption[] }> {
  const response = await apiFetch(`${API_BASE_URL}/api/v2/bank-statements/bank-options`)
  if (!response.ok) throw new Error(await parseApiError(response))
  return response.json()
}

export async function getTransactionsByStatementId(statementId: number): Promise<BankTransactionV2[]> {
  const response = await apiFetch(`${API_BASE_URL}/api/v2/bank-transactions/statement/${statementId}`)
  if (!response.ok) throw new Error(await parseApiError(response))
  const data = await response.json()
  return data.transactions || data || []
}

export async function updateBankTransaction(id: number, updates: Partial<BankTransactionV2>): Promise<BankTransactionV2> {
  const response = await apiFetch(`${API_BASE_URL}/api/v2/bank-transactions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  })
  if (!response.ok) throw new Error(await parseApiError(response))
  return response.json()
}

export async function createBankTransaction(
  payload: {
    statementId: number
    transactionIndex?: number
    dateOperation: string
    dateValeur?: string
    libelle: string
    compte?: string
    categorie?: string
    sens?: "DEBIT" | "CREDIT"
    debit?: number
    credit?: number
    isLinked?: boolean
  }
): Promise<BankTransactionV2> {
  const response = await apiFetch(`${API_BASE_URL}/api/v2/bank-transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(await parseApiError(response))
  return response.json()
}

// ============================================
// DOSSIERS API
// ============================================

export type BackendDossierDto = {
  id: number
  name: string
  status?: string
  comptableId?: number
  comptableEmail?: string
  fournisseurId?: number
  fournisseurEmail?: string
  createdAt?: string
  invoicesCount?: number
  bankStatementsCount?: number
  pendingInvoicesCount?: number
  validatedInvoicesCount?: number
}

export async function getDossiers(): Promise<BackendDossierDto[]> {
  const response = await apiFetch(`${API_BASE_URL}/api/dossiers`)
  if (!response.ok) throw new Error(await parseApiError(response))
  const data = await response.json()
  return data.dossiers || []
}

export async function createDossier(payload: { nom: string; fournisseurEmail: string; fournisseurPassword: string }): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/api/dossiers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(await parseApiError(response))
  return response.json()
}

export async function deleteDossier(id: number): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/api/dossiers/${id}`, { method: "DELETE" })
  if (!response.ok) throw new Error(await parseApiError(response))
}

// ============================================
// UNIFIED API OBJECT
// ============================================

export const api = {
  // Dossiers
  getDossiers,
  createDossier,
  deleteDossier,

  // Accounting - Accounts
  getAccounts,
  getAccountById,
  getAccountByCode,
  searchAccounts,
  getAccountsByClasse,
  createAccount,
  updateAccount,
  deactivateAccount,
  activateAccount,
  importAccounts,
  getChargeAccounts,
  getTvaAccounts,
  getFournisseurAccounts,

  // Accounting - Tiers
  getTiers: getAllTiers,
  getAllTiers,
  getTierById,
  getTierByTierNumber,
  getTierByIfNumber,
  getTierByIce,
  searchTiers,
  createTier,
  updateTier,
  deactivateTier,
  activateTier,

  // Accounting - Configs
  getAccountingConfigs,
  createAccountingConfig,
  updateAccountingConfig,
  deleteAccountingConfig,
  getAccountingConfigBanks,
  generateAccountingFromXmlUrl,
  simulateComptabilisation,
  confirmComptabilisation,

  // Bank Statements
  uploadBankStatement,
  processBankStatement,
  getAllBankStatements,
  getBankStatementById,
  validateBankStatement,
  updateBankStatementStatus,
  updateBankStatementTtcRule,
  deleteBankStatement,
  deleteAllBankStatements,
  getBankStatementStats,
  retryFailedBankStatementPages,
  getBankOptions,
  getTransactionsByStatementId,
  updateBankTransaction,
  createBankTransaction,
}
