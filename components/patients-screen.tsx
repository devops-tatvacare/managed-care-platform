"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import SearchBox from "./search-box"
import PatientDetailTabs from "./patient-detail-tabs"
import { X, ChevronDown, ChevronLeft, ChevronRight, Check, XCircle, Columns3Cog } from "lucide-react"
import { getStatusBadgeClass } from "@/utils/badge-styles"
import { generatePatientsData, type Patient } from "@/lib/generate-patients-data"

interface PatientsScreenProps {
  onNavigateToTatvaAI?: (empiId: string) => void
}

export default function PatientsScreen({ onNavigateToTatvaAI }: PatientsScreenProps = {}) {
  const [allPatientsData] = useState<Patient[]>(() => generatePatientsData(500))
  const [currentPage, setCurrentPage] = useState(1)
  const [searchFilters, setSearchFilters] = useState<Record<string, string>>({})
  const [openPatientTabs, setOpenPatientTabs] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("patients")
  const [visibleTabsCount, setVisibleTabsCount] = useState(0)
  const [showTabDropdown, setShowTabDropdown] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)
  // All available columns definition moved above for initial full selection
  const allColumns = [
    { key: "empiId", label: "EMPI ID" },
    { key: "name", label: "Name" },
    { key: "mobileNumber", label: "Mobile Number" },
    { key: "source", label: "Source" },
    { key: "programName", label: "Program Name" },
    { key: "status", label: "Status" },
    { key: "doctorName", label: "Doctor Name" },
    { key: "lastConsultation", label: "Last Consultation" },
    { key: "nextConsultation", label: "Next Consultation" },
    { key: "insuranceProvider", label: "Insurance Provider" },
    { key: "lastClaimSubmissionDate", label: "Last Claim Date" },
    { key: "assigningAuthority", label: "Assigning Authority" },
    { key: "headOfFamily", label: "Head of Family" },
    { key: "familyId", label: "Family ID" },
    { key: "cpf", label: "CPF" },
    { key: "cpfMasked", label: "CPF (Masked)" },
    { key: "cohort", label: "Cohort" },
    { key: "riskScore", label: "Risk Score" },
    { key: "dateOfBirth", label: "Date of Birth" },
    { key: "address", label: "Address" },
    { key: "pincode", label: "Pincode" },
    { key: "gender", label: "Gender" },
    { key: "deceasedFlag", label: "Deceased" },
    { key: "preferredLanguage", label: "Language" },
    { key: "matchStrategy", label: "Match Strategy" },
    { key: "autoLinkFlag", label: "Auto-link" },
    { key: "sourceSystems", label: "Source Systems" },
    { key: "createdAt", label: "Created At" },
    { key: "lastUpdatedAt", label: "Last Updated" }
  ]
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => [
    "empiId", "name", "mobileNumber", "source", "programName", "status", "doctorName", "lastConsultation", "insuranceProvider"
  ])
  const [showColumnSelector, setShowColumnSelector] = useState(false)
  
  const itemsPerPage = 50

  // Extract unique values for dropdowns
  const uniqueValues = useMemo(() => {
    const sources = [...new Set(allPatientsData.map(p => p.source))].sort()
    const programs = [...new Set(allPatientsData.map(p => p.programName))].sort()
    const doctors = [...new Set(allPatientsData.map(p => p.doctorName))].sort()
    const authorities = [...new Set(allPatientsData.map(p => p.assigningAuthority))].sort()
    const statuses = [...new Set(allPatientsData.map(p => p.status))].sort()
    
    return {
      sources,
      programs,
      doctors,
      authorities,
      statuses
    }
  }, [allPatientsData])

  // Generate search fields dynamically with actual data
  const searchFields = useMemo(() => [
    { key: "empiId", label: "EMPI ID", type: "text" as const },
    { key: "name", label: "Name", type: "text" as const },
    { key: "mobileNumber", label: "Mobile Number", type: "text" as const },
    {
      key: "source",
      label: "Source",
      type: "select" as const,
      options: [
        { value: "all", label: "All Sources" },
        ...uniqueValues.sources.map(source => ({ value: source, label: source }))
      ],
    },
    {
      key: "programName",
      label: "Program Name",
      type: "select" as const,
      options: [
        { value: "all", label: "All Programs" },
        ...uniqueValues.programs.map(program => ({ value: program, label: program }))
      ],
    },
    {
      key: "doctorName",
      label: "Doctor Name",
      type: "select" as const,
      options: [
        { value: "all", label: "All Doctors" },
        ...uniqueValues.doctors.map(doctor => ({ value: doctor, label: doctor }))
      ],
    },
    {
      key: "assigningAuthority",
      label: "Assigning Authority",
      type: "select" as const,
      options: [
        { value: "all", label: "All Authorities" },
        ...uniqueValues.authorities.map(authority => ({ value: authority, label: authority }))
      ],
    },
    { key: "cpf", label: "CPF", type: "text" as const },
    {
      key: "status",
      label: "Status",
      type: "select" as const,
      options: [
        { value: "all", label: "All Statuses" },
        ...uniqueValues.statuses.map(status => ({ value: status, label: status }))
      ],
    },
  ], [uniqueValues])

  // allColumns moved above

  // Filter patients based on search filters
  const filteredPatients = useMemo(() => {
    return allPatientsData.filter(patient => {
      for (const [key, value] of Object.entries(searchFilters)) {
        if (!value || value === "all") continue
        
        // Text search fields (partial match)
        if (key === "empiId" && !patient.empiId.toLowerCase().includes(value.toLowerCase())) {
          return false
        }
        if (key === "name" && !patient.name.toLowerCase().includes(value.toLowerCase())) {
          return false
        }
        if (key === "mobileNumber" && !patient.mobileNumber.includes(value)) {
          return false
        }
        if (key === "cpf" && !patient.cpf.toLowerCase().includes(value.toLowerCase())) {
          return false
        }
        
        // Dropdown fields (exact match)
        if (key === "source" && value !== "all" && patient.source !== value) {
          return false
        }
        if (key === "programName" && value !== "all" && patient.programName !== value) {
          return false
        }
        if (key === "doctorName" && value !== "all" && patient.doctorName !== value) {
          return false
        }
        if (key === "assigningAuthority" && value !== "all" && patient.assigningAuthority !== value) {
          return false
        }
        if (key === "status" && value !== "all" && patient.status !== value) {
          return false
        }
      }
      return true
    })
  }, [allPatientsData, searchFilters])

  // Paginate filtered results
  const paginatedPatients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredPatients.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredPatients, currentPage])

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage)

  useEffect(() => {
    const calculateVisibleTabs = () => {
      const screenWidth = window.innerWidth
      const availableWidth = screenWidth - 300
      const tabWidth = 200
      const maxVisibleTabs = Math.floor(availableWidth / tabWidth)
      const finalCount = Math.max(1, Math.min(maxVisibleTabs, 2))
      setVisibleTabsCount(finalCount)
    }

    calculateVisibleTabs()
    window.addEventListener("resize", calculateVisibleTabs)
    return () => window.removeEventListener("resize", calculateVisibleTabs)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTabDropdown) {
        setShowTabDropdown(false)
      }
      if (showColumnSelector) {
        const target = event.target as HTMLElement
        if (!target.closest('.column-selector-container')) {
          setShowColumnSelector(false)
        }
      }
    }

    if (showTabDropdown || showColumnSelector) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showTabDropdown, showColumnSelector])

  const handleSearch = (filters: Record<string, string>) => {
    setSearchFilters(filters)
    setCurrentPage(1)
  }

  const handleRowDoubleClick = (empiId: string) => {
    if (!openPatientTabs.includes(empiId)) {
      setOpenPatientTabs((prev) => [...prev, empiId])
    }
    setActiveTab(empiId)
  }

  const handleCloseTab = (empiId: string) => {
    setOpenPatientTabs((prev) => prev.filter((id) => id !== empiId))
    if (activeTab === empiId) {
      setActiveTab("patients")
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "secondary" // Green appearance
      case "inactive":
        return "outline"   // Gray appearance
      case "pending":
        return "outline"   // Gray appearance
      default:
        return "outline"   // Gray appearance
    }
  }

  const toggleColumn = (columnKey: string) => {
    setSelectedColumns(prev => 
      prev.includes(columnKey) 
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    )
  }

  const handleSelectAll = () => {
    const allColumnKeys = allColumns.map(col => col.key)
    setSelectedColumns(allColumnKeys)
  }

  const handleDeselectAll = () => {
    setSelectedColumns([])
  }

  const isAllSelected = selectedColumns.length === allColumns.length

  const formatCellValue = (key: string, value: any): string => {
    if (value === null || value === undefined || value === "") return "-"
    
    if (key === "deceasedFlag") {
      return value ? "Yes" : "No"
    }
    if (key === "autoLinkFlag") {
      return value ? "Yes" : "No"
    }
    if (key === "sourceSystems" && Array.isArray(value)) {
      return value.join(", ")
    }
    
    return String(value)
  }

  // Dynamically compute how many patient tabs fit
  useEffect(() => {
    const estimateWidth = (label: string) => {
      const avgChar = 7.2 // px for text-sm
      const labelPx = Math.min(180, Math.max(60, label.length * avgChar))
      const padding = 32 // px-4 left + px-4 right
      const closeBtn = 24 + 8 // icon + margin
      const border = 2
      return Math.round(labelPx + padding + closeBtn + border)
    }

    const recalc = () => {
      const container = navRef.current
      const totalWidth = container?.clientWidth || window.innerWidth
      const baseTabWidth = estimateWidth("Patients")
      const moreWidth = 94 // space for More (...) button when needed
      let remaining = totalWidth
      remaining -= baseTabWidth

      const labels = openPatientTabs.map(id => {
        const p = allPatientsData.find(pp => pp.empiId === id)
        return p?.name || id
      })
      let count = 0
      // First pass: assume no More button
      for (let i = 0; i < labels.length; i++) {
        const w = estimateWidth(labels[i])
        if (remaining - w >= 0) {
          remaining -= w
          count++
        } else {
          break
        }
      }
      // If not all fit, reserve space for More and recompute greedily
      if (count < labels.length) {
        remaining = totalWidth - baseTabWidth - moreWidth
        count = 0
        for (let i = 0; i < labels.length; i++) {
          const w = estimateWidth(labels[i])
          if (remaining - w >= 0) {
            remaining -= w
            count++
          } else {
            break
          }
        }
      }
      setVisibleTabsCount(Math.max(0, count))
    }

    recalc()
    window.addEventListener("resize", recalc)
    return () => window.removeEventListener("resize", recalc)
  }, [openPatientTabs, allPatientsData])

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-stroke h-12 flex-shrink-0">
        <div ref={navRef} className="flex items-center h-full overflow-hidden">
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 h-full flex items-center ${
              activeTab === "patients"
                ? "border-brand text-brand"
                : "border-transparent text-text80 hover:text-text100"
            }`}
            onClick={() => setActiveTab("patients")}
          >
            Patients
          </button>

          {openPatientTabs.slice(0, visibleTabsCount).map((empiId) => {
            const patient = allPatientsData.find(p => p.empiId === empiId)
            return (
              <div key={empiId} className="flex items-center h-full">
                <button
                  className={`px-4 py-3 text-sm font-medium border-b-2 h-full flex items-center ${
                    activeTab === empiId
                      ? "border-brand text-brand"
                      : "border-transparent text-text80 hover:text-text100"
                  }`}
                  onClick={() => setActiveTab(empiId)}
                >
                  {patient?.name || empiId}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCloseTab(empiId)
                  }}
                  className="ml-1 p-1 hover:bg-bg10 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )
          })}

          {openPatientTabs.length > visibleTabsCount && (
            <div className="relative h-full">
              <button
                className="px-4 py-3 text-sm font-medium border-b-2 border-transparent text-text80 hover:text-text100 h-full flex items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowTabDropdown(!showTabDropdown)
                }}
              >
                More ({openPatientTabs.length - visibleTabsCount})
                <ChevronDown className="w-3 h-3" />
              </button>

              {showTabDropdown && (
                <div
                  className="absolute top-full left-0 mt-1 bg-white border border-stroke rounded-lg shadow-xl z-[9999] min-w-48"
                  onClick={(e) => e.stopPropagation()}
                >
                  {openPatientTabs.slice(visibleTabsCount).map((empiId) => {
                    const patient = allPatientsData.find(p => p.empiId === empiId)
                    return (
                      <div
                        key={empiId}
                        className="flex items-center hover:bg-bg10 border-b border-stroke last:border-b-0"
                      >
                        <button
                          className={`flex-1 px-4 py-3 text-left text-sm ${
                            activeTab === empiId ? "text-brand font-medium" : "text-text100"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveTab(empiId)
                            setShowTabDropdown(false)
                          }}
                        >
                          {patient?.name || empiId}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCloseTab(empiId)
                          }}
                          className="p-2 hover:bg-bg100 rounded mr-2"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "patients" ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search Box and Controls with fixed-height decorative background at the top */}
            <div className="relative flex-shrink-0 z-10">
              <div
                aria-hidden
                className="absolute left-0 top-0 right-0 pointer-events-none z-0"
                style={{
                  height: 200,
                  backgroundImage: "url(/primary_background.svg)",
                  backgroundSize: "cover",
                  backgroundPosition: "center top",
                  backgroundRepeat: "no-repeat",
                }}
              />
              <div className="relative z-10 px-6 pt-6 pb-4">
                <SearchBox fields={searchFields} onSearch={handleSearch} />
              </div>
            </div>

            {/* Column Selector and Results Count */}
            <div className="px-6 pb-4 flex justify-between items-center flex-shrink-0">
              <div className="text-sm text-text80">
                Showing {paginatedPatients.length} of {filteredPatients.length} patients
              </div>
              <div className="relative column-selector-container">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowColumnSelector(!showColumnSelector)}
                  className="flex items-center gap-2"
                >
                  <Columns3Cog className="w-4 h-4 text-text80" />
                  <span>Columns ({selectedColumns.length})</span>
                </Button>
                
                {showColumnSelector && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                    <div className="p-2 border-b">
                      <div className="text-sm font-medium mb-2">Select Columns</div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSelectAll}
                          disabled={isAllSelected}
                          className="text-xs px-2 py-1 bg-brand/10 text-brand rounded hover:bg-brand/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Select All
                        </button>
                        <button
                          onClick={handleDeselectAll}
                          disabled={selectedColumns.length === 0}
                          className="text-xs px-2 py-1 bg-bg10 text-text80 rounded hover:bg-bg100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {allColumns.map(column => (
                        <div
                          key={column.key}
                          className="flex items-center px-3 py-2 hover:bg-bg10 cursor-pointer"
                          onClick={() => toggleColumn(column.key)}
                        >
                          <div className="w-4 h-4 mr-2">
                            {selectedColumns.includes(column.key) && <Check className="w-4 h-4 text-success" />}
                          </div>
                          <span className="text-sm">{column.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Patients Table */}
            <div className="flex-1 px-6 overflow-hidden min-h-0 flex flex-col">
              <div className="bg-white border border-stroke rounded-lg flex-1 min-h-0 relative overflow-x-auto">
                <Table className="w-full border-separate">
                  <TableHeader className="sticky top-0 bg-[hsl(var(--bg-10))] z-20">
                    <TableRow>
                      {allColumns
                        .filter(col => selectedColumns.includes(col.key))
                        .map(col => (
                          <TableHead key={col.key} className="sticky top-0 bg-[hsl(var(--bg-10))] z-20 whitespace-nowrap">
                            {col.label}
                          </TableHead>
                        ))
                      }
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPatients.map((patient) => (
                      <TableRow
                        key={patient.empiId}
                        className="cursor-pointer hover:bg-bg10"
                        onDoubleClick={() => handleRowDoubleClick(patient.empiId)}
                      >
                        {allColumns
                          .filter(col => selectedColumns.includes(col.key))
                          .map(col => (
                            <TableCell key={col.key} className="whitespace-nowrap">
                              {col.key === "status" ? (
                                <Badge
                                  variant="outline"
                                  className={`text-xs px-2 py-1 whitespace-nowrap ${getStatusBadgeClass(patient.status)}`}
                                >
                                  {patient.status}
                                </Badge>
                              ) : col.key === "deceasedFlag" ? (
                                patient.deceasedFlag ? (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                ) : (
                                  <Check className="w-4 h-4 text-green-500" />
                                )
                              ) : col.key === "autoLinkFlag" ? (
                                patient.autoLinkFlag ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <span className="text-text80">-</span>
                                )
                              ) : (
                                formatCellValue(col.key, patient[col.key as keyof Patient])
                              )}
                            </TableCell>
                          ))
                        }
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 flex items-center justify-between bg-[hsl(var(--bg-10))] border-t border-[hsl(var(--stroke-grey))] flex-shrink-0">
              <div className="text-sm text-[hsl(var(--text-80))]">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="text-[hsl(var(--text-80))] hover:text-[hsl(var(--text-100))] border-[hsl(var(--stroke-grey))] hover:bg-[hsl(var(--bg-10))] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex gap-1">
                  {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = idx + 1
                    } else if (currentPage <= 3) {
                      pageNum = idx + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + idx
                    } else {
                      pageNum = currentPage - 2 + idx
                    }
                    
                    return (
                      <Button
                        key={idx}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 ${
                          currentPage === pageNum 
                            ? "bg-[hsl(var(--brand-primary))] text-white hover:bg-[hsl(var(--brand-primary))]" 
                            : "text-[hsl(var(--text-80))] hover:text-[hsl(var(--text-100))] border-[hsl(var(--stroke-grey))] hover:bg-[hsl(var(--bg-10))]"
                        }`}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="text-[hsl(var(--text-80))] hover:text-[hsl(var(--text-100))] border-[hsl(var(--stroke-grey))] hover:bg-[hsl(var(--bg-10))] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <PatientDetailTabs 
            patientId={activeTab} 
            onNavigateToTatvaAI={onNavigateToTatvaAI}
          />
        )}
      </div>
    </div>
  )
}
