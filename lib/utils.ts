import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================
// FORMATAGE
// ============================================

export function formatAmount(amount: number | string | null): string {
  if (amount === null || amount === undefined || amount === "") {
    return "-"
  }
  const num = typeof amount === "string" ? Number.parseFloat(amount) : amount
  if (isNaN(num)) {
    return "-"
  }
  return `${num.toFixed(2)} DH`
}

export function formatDate(date: Date | string | null): string {
  if (!date) {
    return "-"
  }
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) {
    return "-"
  }
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) {
    return "-"
  }
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
