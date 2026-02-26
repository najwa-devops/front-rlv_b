import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { ClientLayout } from "@/components/client-layout"
import { QueryProvider } from "@/src/components/providers/query-provider"
import { AuthProvider } from "@/src/components/providers/auth-provider"
import { DossierProvider } from "@/src/contexts/dossier-context"
import "./globals.css"

export const metadata: Metadata = {
  title: "BankingOCR - Gestion intelligente des relevés bancaires",
  description: "Application de traitement OCR et validation de relevés bancaires",
  generator: "iboice.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <AuthProvider>
            <DossierProvider>
              <QueryProvider>
                <ClientLayout>
                  {children}
                </ClientLayout>
              </QueryProvider>
            </DossierProvider>
          </AuthProvider>
          <Toaster richColors position="top-right" closeButton />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
