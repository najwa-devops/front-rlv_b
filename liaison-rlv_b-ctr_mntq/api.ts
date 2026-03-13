import { CmExpansion, RapprochementResult } from "./types"

const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/$/, "") === "/api" ? "" : RAW_API_BASE_URL.replace(/\/$/, "")

async function parseApiError(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type")
  const fallback = `HTTP ${response.status} ${response.statusText || ""}`.trim()
  try {
    if (contentType && contentType.includes("application/json")) {
      const errorData = await response.json() as any
      const code = errorData.code || errorData.errorCode
      const message = errorData.error || errorData.message || fallback
      return code ? `${message} (${code})` : message
    }
    const text = await response.text()
    return text || fallback
  } catch {
    return fallback
  }
}

export async function getRapprochement(id: number): Promise<RapprochementResult> {
  const response = await fetch(`${API_BASE_URL}/api/v2/centre-monetique/${id}/rapprochement`)
  if (!response.ok) throw new Error(await parseApiError(response))
  return response.json()
}

export async function getCmExpansionsForStatement(statementId: number): Promise<CmExpansion[]> {
  const response = await fetch(`${API_BASE_URL}/api/v2/centre-monetique/statement/${statementId}/expansions`)
  if (!response.ok) throw new Error(await parseApiError(response))
  return response.json()
}
