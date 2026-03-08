"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Search, CalendarIcon, X, Download, Filter } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useIsMobile } from "@/hooks/use-mobile"
import { Label } from "@/components/ui/label"

export interface BankFilterValues {
  search: string
  bank: string
  status: "all" | "pending" | "validated" | "accounted"
  dateFrom?: Date
  dateTo?: Date
  amountMin?: number
  amountMax?: number
}

interface BankStatementFiltersProps {
  filters: BankFilterValues
  onFiltersChange: (filters: BankFilterValues) => void
  banks: string[]
  onExport: (format: "csv" | "excel" | "pdf") => void
}

export function BankStatementFilters({ filters, onFiltersChange, banks, onExport }: BankStatementFiltersProps) {
  const [dateFromOpen, setDateFromOpen] = useState(false)
  const [dateToOpen, setDateToOpen] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const isMobile = useIsMobile()

  const updateFilter = <K extends keyof BankFilterValues>(key: K, value: BankFilterValues[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      bank: "",
      status: "all",
      dateFrom: undefined,
      dateTo: undefined,
      amountMin: undefined,
      amountMax: undefined,
    })
  }

  const hasActiveFilters =
    filters.search ||
    filters.bank ||
    (filters.status && filters.status !== "all") ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.amountMin !== undefined ||
    filters.amountMax !== undefined

  const activeFiltersCount = [
    filters.bank,
    filters.status !== "all" ? filters.status : "",
    filters.dateFrom,
    filters.dateTo,
    filters.amountMin,
    filters.amountMax,
  ].filter(Boolean).length

  const FiltersContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Banque</Label>
        <Select value={filters.bank || "all"} onValueChange={(v) => updateFilter("bank", v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Toutes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {banks.map((bank) => (
              <SelectItem key={bank} value={bank}>
                {bank}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Statut</Label>
        <Select value={filters.status} onValueChange={(v) => updateFilter("status", v as BankFilterValues["status"])}>
          <SelectTrigger>
            <SelectValue placeholder="Tous" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="pending">A traiter</SelectItem>
            <SelectItem value="validated">Valide</SelectItem>
            <SelectItem value="accounted">Comptabilise</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Periode</Label>
        <div className="flex gap-2">
          <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex-1 justify-start text-left font-normal bg-transparent">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateFrom ? format(filters.dateFrom, "dd/MM/yy") : "Debut"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filters.dateFrom}
                onSelect={(date) => {
                  updateFilter("dateFrom", date)
                  setDateFromOpen(false)
                }}
                locale={fr}
              />
            </PopoverContent>
          </Popover>

          <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex-1 justify-start text-left font-normal bg-transparent">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateTo ? format(filters.dateTo, "dd/MM/yy") : "Fin"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filters.dateTo}
                onSelect={(date) => {
                  updateFilter("dateTo", date)
                  setDateToOpen(false)
                }}
                locale={fr}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Mouvement (DH)</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filters.amountMin ?? ""}
            onChange={(e) => updateFilter("amountMin", e.target.value ? Number(e.target.value) : undefined)}
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Max"
            value={filters.amountMax ?? ""}
            onChange={(e) => updateFilter("amountMax", e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
      </div>

      {hasActiveFilters && (
        <Button variant="outline" className="w-full bg-transparent" onClick={clearFilters}>
          <X className="mr-2 h-4 w-4" />
          Effacer les filtres
        </Button>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex-1 gap-2 bg-transparent">
                <Filter className="h-4 w-4" />
                Filtres
                {activeFiltersCount > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh]">
              <SheetHeader>
                <SheetTitle>Filtres</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <FiltersContent />
              </div>
            </SheetContent>
          </Sheet>

          <Select onValueChange={(v) => onExport(v as "csv" | "excel" | "pdf")}>
            <SelectTrigger className="w-auto">
              <Download className="h-4 w-4" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par fichier, rib, banque..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filters.bank || "all"} onValueChange={(v) => updateFilter("bank", v === "all" ? "" : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Banque" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {banks.map((bank) => (
              <SelectItem key={bank} value={bank}>
                {bank}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => updateFilter("status", v as BankFilterValues["status"])}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="pending">A traiter</SelectItem>
            <SelectItem value="validated">Valide</SelectItem>
            <SelectItem value="accounted">Comptabilise</SelectItem>
          </SelectContent>
        </Select>

        <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[140px] justify-start text-left font-normal bg-transparent">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateFrom ? format(filters.dateFrom, "dd/MM/yyyy") : "Date debut"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={filters.dateFrom}
              onSelect={(date) => {
                updateFilter("dateFrom", date)
                setDateFromOpen(false)
              }}
              locale={fr}
            />
          </PopoverContent>
        </Popover>

        <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[140px] justify-start text-left font-normal bg-transparent">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateTo ? format(filters.dateTo, "dd/MM/yyyy") : "Date fin"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={filters.dateTo}
              onSelect={(date) => {
                updateFilter("dateTo", date)
                setDateToOpen(false)
              }}
              locale={fr}
            />
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-4 w-4" />
            Effacer
          </Button>
        )}

        <Select onValueChange={(v) => onExport(v as "csv" | "excel" | "pdf")}>
          <SelectTrigger className="w-[130px]">
            <Download className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Exporter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="csv">CSV</SelectItem>
            <SelectItem value="excel">Excel</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Mouvement:</span>
        <Input
          type="number"
          placeholder="Min"
          value={filters.amountMin ?? ""}
          onChange={(e) => updateFilter("amountMin", e.target.value ? Number(e.target.value) : undefined)}
          className="w-24"
        />
        <span className="text-muted-foreground">-</span>
        <Input
          type="number"
          placeholder="Max"
          value={filters.amountMax ?? ""}
          onChange={(e) => updateFilter("amountMax", e.target.value ? Number(e.target.value) : undefined)}
          className="w-24"
        />
        <span className="text-sm text-muted-foreground">DH</span>
      </div>
    </div>
  )
}
