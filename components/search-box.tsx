"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X, ChevronDown, ChevronUp } from "lucide-react"

interface SearchField {
  key: string
  label: string
  type: "text" | "select"
  options?: { value: string; label: string }[]
}

interface SearchBoxProps {
  fields: SearchField[]
  onSearch: (filters: Record<string, string>) => void
  className?: string
}

export default function SearchBox({ fields, onSearch, className = "" }: SearchBoxProps) {
  // Draft filters reflect what's being typed/selected in the UI.
  const [filters, setFilters] = useState<Record<string, string>>({})
  // Applied filters reflect what has been submitted via Search.
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({})
  const [isExpanded, setIsExpanded] = useState(false)

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleSearch = () => {
    setAppliedFilters(filters)
    onSearch(filters)
  }

  const handleClear = () => {
    setFilters({})
    setAppliedFilters({})
    onSearch({})
  }

  const hasActiveFilters = Object.values(appliedFilters).some((value) => value && value !== "all")

  // Split fields into first row (4 fields) and remaining
  const firstRowFields = fields.slice(0, 4)
  const remainingFields = fields.slice(4)

  const renderField = (field: SearchField) => (
    <div key={field.key} className="space-y-1">
      <label className="text-sm font-medium text-text100">{field.label}</label>
      {field.type === "text" ? (
        <Input
          placeholder={`Search ${field.label.toLowerCase()}`}
          value={filters[field.key] || ""}
          onChange={(e) => handleFilterChange(field.key, e.target.value)}
          className="h-9"
        />
      ) : (
        <Select value={filters[field.key] || "all"} onValueChange={(value) => handleFilterChange(field.key, value)}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option.value || "all"} value={option.value || "all"}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )

  return (
    <div className={`bg-white border border-stroke rounded-lg transition-all duration-300 ${className}`}>
      <div className="p-4">
        {/* First row - always visible */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {firstRowFields.map(renderField)}
        </div>

        {/* Expanded section with remaining fields */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? "max-h-96 mt-4" : "max-h-0"
          }`}
        >
          {remainingFields.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-stroke">
              {remainingFields.map(renderField)}
            </div>
          )}
        </div>

        {/* Action buttons row */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-stroke">
          <div className="flex gap-2">
            <Button onClick={handleSearch} size="sm" className="h-9 bg-brand text-white hover:bg-brand/90">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
            {hasActiveFilters && (
              <Button onClick={handleClear} variant="outline" size="sm" className="h-9">
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Expand/Collapse button */}
          {remainingFields.length > 0 && (
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant="ghost"
              size="sm"
              className="h-9 text-text80 hover:text-text100"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Show More ({remainingFields.length} more fields)
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="px-4 py-2 bg-brand/10 border-t border-brand/20">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-brand font-medium">Active filters:</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(appliedFilters).map(([key, value]) => {
                if (!value || value === "all") return null
                const field = fields.find(f => f.key === key)
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-md border border-brand/20"
                  >
                    <span className="text-text80">{field?.label}:</span>
                    <span className="font-medium text-text100">
                      {field?.type === "select" 
                        ? field.options?.find(o => o.value === value)?.label || value
                        : value}
                    </span>
                    <button
                      onClick={() => {
                        const newApplied = { ...appliedFilters }
                        delete newApplied[key]
                        // Keep UI inputs in sync with removal
                        setAppliedFilters(newApplied)
                        setFilters(newApplied)
                        onSearch(newApplied)
                      }}
                      className="ml-1 text-text80 hover:text-text100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
