"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { X, ChevronDown, CheckCircle2, XCircle, Upload, Brain, FileText } from "lucide-react"
import SearchBox from "./search-box"
import { generatePatientsData } from "@/lib/generate-patients-data"
import { generatePatientDetailsData } from "@/lib/generate-patient-details-data"
import { toast } from "sonner"
import RaiseClaimModal from "@/components/raise-claim-modal"

const basePatients = generatePatientsData(1000)
const maria = basePatients.find(p => p.empiId === "EMPI999901")
const mariaDetails = maria ? generatePatientDetailsData("EMPI999901", maria) : null

const searchFields = [
  { key: "visitId", label: "Visit ID", type: "text" as const },
  { key: "status", label: "Status", type: "select" as const, options: [
    { value: "all", label: "All Statuses" },
    { value: "Pending", label: "Pending" },
    { value: "Submitted", label: "Submitted" },
    { value: "Under Review", label: "Under Review" },
    { value: "Approved", label: "Approved" },
    { value: "Rejected", label: "Rejected" },
  ]},
  { key: "visitType", label: "Visit Type", type: "text" as const },
  { key: "name", label: "Patient Name", type: "text" as const },
  { key: "empiId", label: "EMPI ID", type: "text" as const },
]

type HospitalVisit = {
  visitId: string
  visitDate: string
  patientName: string
  empiId: string
  doctorName: string
  visitType: string
  duration: string
  fees: string
  status: string
  notes: string
  clinic: string
}

// Generate hospital visits for Dr Sophie from Maria's consultation history
const generateHospitalVisits = (): HospitalVisit[] => {
  if (!mariaDetails) return []
  
  const drSophieVisits = mariaDetails.consultationHistory
    .filter(visit => visit.doctorName === 'Dr. Sophie')
    .map((visit, index) => ({
      visitId: `HSP-${String(index + 1001).padStart(6, '0')}`,
      visitDate: visit.date,
      patientName: maria?.name || "Maria Silva",
      empiId: maria?.empiId || "EMPI999901",
      doctorName: visit.doctorName,
      visitType: visit.type,
      duration: visit.duration,
      fees: `₱${Math.floor(Math.random() * 5000) + 2000}`,
      status: index === 0 ? "Submitted" : index === 1 ? "Under Review" : index === 2 ? "Rejected" : "Pending",
      notes: visit.notes,
      clinic: visit.clinic
    }))

  // Add Maria's IPD admission for delivery (May 25, 2025)
  const ipdAdmission: HospitalVisit = {
    visitId: 'HSP-001999',
    visitDate: '2025-05-25',
    patientName: maria?.name || "Maria Silva",
    empiId: maria?.empiId || "EMPI999901",
    doctorName: 'Dr. Sophie',
    visitType: 'IPD - Delivery',
    duration: '3 days',
    fees: '₱85,000',
    status: 'Pending',
    notes: 'Inpatient admission for delivery. Normal delivery expected. Insurance pre-authorization required.',
    clinic: 'Reliance United'
  }

  // Add diagnostic visits from Reliance United Diagnostics for Maria
  const relianceLabReports = mariaDetails.labReports.filter(lab => lab.diagnosticsName === 'Reliance United Diagnostics')
  const diagnosticVisits: HospitalVisit[] = relianceLabReports
    .map((lab, index) => ({
      visitId: `DIAG-${String(index + 2001).padStart(6, '0')}`,
      visitDate: lab.date,
      patientName: maria?.name || "Maria Silva",
      empiId: maria?.empiId || "EMPI999901",
      doctorName: lab.prescribedBy || 'Dr. Sophie',
      visitType: `Diagnostics - ${lab.testName}`,
      duration: '1 hour',
      fees: lab.testName.includes('CBC') ? '₱800' : 
            lab.testName.includes('HbA1c') ? '₱1,500' : 
            lab.testName.includes('Urine') ? '₱300' : 
            lab.testName.includes('TSH') ? '₱1,200' : 
            lab.testName.includes('Vitamin D') ? '₱1,100' :
            lab.testName.includes('Vitamin B12') ? '₱950' :
            lab.testName.includes('HIV') ? '₱850' :
            lab.testName.includes('AMH') ? '₱2,500' :
            lab.testName.includes('LH') ? '₱700' :
            lab.testName.includes('FSH') ? '₱700' : '₱900',
      status: index % 3 === 0 ? "Pending" : index % 3 === 1 ? "Submitted" : "Approved",
      notes: `${lab.testName} diagnostic test. ${lab.summary} Prescribed by ${lab.prescribedBy || 'Dr. Sophie'}.`,
      clinic: 'Reliance United Diagnostics'
    }))

  // Add pharmacy visits from Maria's medications data
  const pharmacyVisits: HospitalVisit[] = mariaDetails.medications
    .map((med, index) => ({
      visitId: `PHARM-${String(index + 3001).padStart(6, '0')}`,
      visitDate: med.startDate,
      patientName: maria?.name || "Maria Silva",
      empiId: maria?.empiId || "EMPI999901",
      doctorName: med.prescribedBy,
      visitType: `Pharmacy - ${med.medicationName}`,
      duration: '30 mins',
      fees: med.medicationName.includes('Folic Acid') ? '₱350' :
            med.medicationName.includes('Ferrous Sulfate') ? '₱500' :
            med.medicationName.includes('Calcium') ? '₱400' :
            med.medicationName.includes('Prenatal Multivitamin') ? '₱200' : '₱300',
      status: med.notes.includes('Covered by claim') ? "Approved" : 
              med.notes.includes('Non-claim') ? "Self-Pay" : "Pending",
      notes: `${med.medicationName} ${med.dosage} - ${med.frequency}. ${med.purpose}. ${med.notes}`,
      clinic: 'ActiveOne Pharmacy'
    }))

  const allVisits = [ipdAdmission, ...drSophieVisits, ...diagnosticVisits, ...pharmacyVisits]

  // Sort by date (newest first) and ensure we have some pending items
  return allVisits.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())
}

const initialRows: HospitalVisit[] = generateHospitalVisits()
console.log("Generated hospital visits:", initialRows)
console.log("Pharmacy visits:", initialRows.filter(v => v.clinic === 'ActiveOne Pharmacy'))

const actionButtons = [
  { id: "raise", label: "Raise Claim", icon: Upload, variant: "default" as const },
]

export default function HospitalWorklistScreen() {
  const [rows, setRows] = useState<HospitalVisit[]>(initialRows)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [openTabs, setOpenTabs] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("worklist")
  const [visibleTabsCount, setVisibleTabsCount] = useState(0)
  const [showTabDropdown, setShowTabDropdown] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)
  const itemsPerPage = 50
  const [currentPage, setCurrentPage] = useState(1)
  const [isRaiseClaimModalOpen, setIsRaiseClaimModalOpen] = useState(false)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [aiPanelVisitId, setAiPanelVisitId] = useState<string>("")

  // Compute how many visit tabs fit in the nav
  useEffect(() => {
    const estimateWidth = (label: string) => {
      // More accurate character width estimation
      const labelPx = label.length * 8.5 // Improved from 7.2 to better match actual rendering
      const padding = 32 // px-4 = 16px each side
      const closeBtn = 24 // Close button width
      const buttonMargin = 4 // ml-1 margin for close button
      const border = 2
      return Math.round(labelPx + padding + closeBtn + buttonMargin + border)
    }

    const recalc = () => {
      const container = navRef.current
      if (!container) return

      // Get actual container width
      const containerRect = container.getBoundingClientRect()
      const totalWidth = containerRect.width
      
      // Calculate base "Worklist" tab width
      const baseTabWidth = estimateWidth("Worklist")
      
      // "More" dropdown button width - more accurate estimate
      const moreButtonWidth = 100 // "More (X)" button
      
      // Calculate available space for overflow tabs
      let availableWidth = totalWidth - baseTabWidth
      
      const labels = openTabs.map(id => `Visit ${id}`)
      let visibleCount = 0
      
      // Simple, direct calculation - check if we have overflow first
      if (labels.length === 0) {
        setVisibleTabsCount(0)
        return
      }
      
      // Calculate total width needed for all tabs
      let totalNeededWidth = 0
      for (const label of labels) {
        totalNeededWidth += estimateWidth(label)
      }
      
      // If all tabs fit, show them all
      if (totalNeededWidth <= availableWidth) {
        setVisibleTabsCount(labels.length)
        return
      }
      
      // Otherwise, account for "More" button and calculate how many fit
      availableWidth -= moreButtonWidth
      let usedWidth = 0
      
      for (let i = 0; i < labels.length; i++) {
        const tabWidth = estimateWidth(labels[i])
        if (usedWidth + tabWidth <= availableWidth) {
          usedWidth += tabWidth
          visibleCount++
        } else {
          break
        }
      }
      
      setVisibleTabsCount(Math.max(0, visibleCount))
    }
    
    recalc()
    window.addEventListener('resize', recalc)
    return () => window.removeEventListener('resize', recalc)
  }, [openTabs])

  useEffect(() => {
    const handleClickOutside = () => {
      if (showTabDropdown) setShowTabDropdown(false)
    }
    if (showTabDropdown) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showTabDropdown])

  const handleSearch = (filters: Record<string, string>) => {
    const filtered = initialRows.filter(r => {
      if (filters.visitId && !r.visitId.toLowerCase().includes(filters.visitId.toLowerCase())) return false
      if (filters.status && filters.status !== 'all' && r.status !== filters.status) return false
      if (filters.visitType && !r.visitType.toLowerCase().includes(filters.visitType.toLowerCase())) return false
      if (filters.name && !r.patientName.toLowerCase().includes(filters.name.toLowerCase())) return false
      if (filters.empiId && !r.empiId.toLowerCase().includes(filters.empiId.toLowerCase())) return false
      return true
    })
    setRows(filtered)
    setCurrentPage(1)
  }

  const handleRowDoubleClick = (visitId: string) => {
    if (!openTabs.includes(visitId)) setOpenTabs(prev => [...prev, visitId])
    setActiveTab(visitId)
  }

  const handleCloseTab = (tabId: string) => {
    setOpenTabs(prev => prev.filter(id => id !== tabId))
    if (activeTab === tabId) setActiveTab("worklist")
  }

  const handleRowSelect = (visitId: string, selected: boolean) => {
    setSelectedRows(prev => selected ? [...prev, visitId] : prev.filter(id => id !== visitId))
  }

  const handleActionClick = (actionId: string) => {
    if (selectedRows.length === 0) return
    
    if (actionId === "raise") {
      setIsRaiseClaimModalOpen(true)
      return
    }
  }

  const handleClaimSubmitted = (visitIds: string[]) => {
    // Update the status of submitted visits
    setRows(prev => prev.map(r => 
      visitIds.includes(r.visitId) 
        ? { ...r, status: "Submitted" } 
        : r
    ))
    setSelectedRows([])
  }

  const visibleTabs = openTabs.slice(0, visibleTabsCount)
  const overflowTabs = openTabs.slice(visibleTabsCount)
  const totalPages = Math.ceil(rows.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedRows = rows.slice(startIndex, startIndex + itemsPerPage)
  
  console.log("Paginated rows being displayed:", paginatedRows.length)
  console.log("Pharmacy visits in paginated rows:", paginatedRows.filter(v => v.clinic === 'ActiveOne Pharmacy'))

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800 border border-green-200'
      case 'Rejected':
        return 'bg-red-100 text-red-700 border border-red-200'
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
      case 'Submitted':
      case 'Under Review':
        return 'bg-blue-100 text-blue-800 border border-blue-200'
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200'
    }
  }

  const getActionButtonClass = (id: string, disabled: boolean) => {
    const base = "!h-9 disabled:opacity-100 disabled:cursor-not-allowed"
    if (id === 'raise') {
      const enabled = "!text-white !bg-[hsl(var(--brand-primary))] hover:!bg-[hsl(var(--brand-primary))]/90"
      const disabledCls = "disabled:!bg-[hsl(var(--brand-primary))]/30 disabled:!text-white"
      return `${base} ${enabled} ${disabledCls}`
    }
    return base
  }

  return (
    <div className="flex h-full flex-col min-h-0">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-[hsl(var(--stroke-grey))]">
        <div ref={navRef} className="flex items-center h-full overflow-hidden">
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 h-full flex items-center ${
              activeTab === "worklist"
                ? "border-[hsl(var(--brand-primary))] text-[hsl(var(--brand-primary))]"
                : "border-transparent text-[hsl(var(--text-80))] hover:text-[hsl(var(--text-100))]"
            }`}
            onClick={() => setActiveTab("worklist")}
          >
            Worklist
          </button>

          {visibleTabs.map((tabId) => (
            <div key={tabId} className="flex items-center h-full">
              <button
                className={`px-4 py-3 text-sm font-medium border-b-2 h-full flex items-center ${
                  activeTab === tabId
                    ? "border-[hsl(var(--brand-primary))] text-[hsl(var(--brand-primary))]"
                    : "border-transparent text-[hsl(var(--text-80))] hover:text-[hsl(var(--text-100))]"
                }`}
                onClick={() => setActiveTab(tabId)}
              >
                Visit {tabId}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleCloseTab(tabId)
                }}
                className="ml-1 p-1 hover:bg-[hsl(var(--bg-10))] rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {overflowTabs.length > 0 && (
            <div className="relative h-full">
              <button
                className="px-4 py-3 text-sm font-medium border-b-2 border-transparent text-[hsl(var(--text-80))] hover:text-[hsl(var(--text-100))] h-full flex items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowTabDropdown(!showTabDropdown)
                }}
              >
                More ({overflowTabs.length})
                <ChevronDown className="w-3 h-3" />
              </button>

              {showTabDropdown && (
                <div
                  className="absolute top-full left-0 mt-1 bg-white border border-[hsl(var(--stroke-grey))] rounded-lg shadow-xl z-[9999] min-w-48"
                  onClick={(e) => e.stopPropagation()}
                >
                  {overflowTabs.map((tabId) => (
                    <div
                      key={tabId}
                      className="flex items-center hover:bg-[hsl(var(--bg-10))] border-b border-[hsl(var(--stroke-grey))] last:border-b-0"
                    >
                      <button
                        className={`flex-1 px-4 py-3 text-left text-sm ${
                          activeTab === tabId ? "text-[hsl(var(--brand-primary))] font-medium" : "text-[hsl(var(--text-100))]"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveTab(tabId)
                          setShowTabDropdown(false)
                        }}
                      >
                        Visit - {tabId}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCloseTab(tabId)
                        }}
                        className="p-2 hover:bg-[hsl(var(--bg-10))] rounded mr-2"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {activeTab === "worklist" ? (
          <>
            {/* Search + Actions (fixed) */}
            <div className="px-6 pt-6 pb-4 flex-shrink-0 space-y-4 relative z-10">
              {/* Search Box with decorative background */}
              <div className="relative z-10">
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
                <div className="relative z-10">
                  <SearchBox fields={searchFields} onSearch={handleSearch} />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 relative z-10">
                {actionButtons.map((action) => {
                  const Icon = action.icon
                  return (
                    <Button
                      key={action.id}
                      variant={action.variant}
                      size="sm"
                      onClick={() => handleActionClick(action.id)}
                      disabled={selectedRows.length === 0}
                      className={getActionButtonClass(action.id, selectedRows.length === 0)}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {action.label}
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Hospital Visits Table (scrolls) */}
            <div className="flex-1 px-6 overflow-hidden min-h-0 flex flex-col">
              <div className="bg-white border border-[hsl(var(--stroke-grey))] rounded-lg flex-1 min-h-0 relative overflow-y-auto">
                <Table className="min-w-full border-separate">
                  <TableHeader className="sticky top-0 bg-[hsl(var(--bg-10))] z-20">
                    <TableRow>
                      <TableHead className="sticky top-0 bg-[hsl(var(--bg-10))] z-20 w-12">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRows(rows.map((r) => r.visitId))
                            } else {
                              setSelectedRows([])
                            }
                          }}
                          checked={rows.length > 0 && selectedRows.length === rows.length}
                        />
                      </TableHead>
                      <TableHead className="sticky top-0 bg-[hsl(var(--bg-10))] z-20">Visit ID</TableHead>
                      <TableHead className="sticky top-0 bg-[hsl(var(--bg-10))] z-20">Visit Date</TableHead>
                      <TableHead className="sticky top-0 bg-[hsl(var(--bg-10))] z-20">Patient</TableHead>
                      <TableHead className="sticky top-0 bg-[hsl(var(--bg-10))] z-20">EMPI ID</TableHead>
                      <TableHead className="sticky top-0 bg-[hsl(var(--bg-10))] z-20">Doctor</TableHead>
                      <TableHead className="sticky top-0 bg-[hsl(var(--bg-10))] z-20">Visit Type</TableHead>
                      <TableHead className="sticky top-0 bg-[hsl(var(--bg-10))] z-20">Fees</TableHead>
                      <TableHead className="sticky top-0 bg-[hsl(var(--bg-10))] z-20">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRows.map((item) => (
                      <TableRow
                        key={item.visitId}
                        className="cursor-pointer hover:bg-[hsl(var(--bg-10))]"
                        onDoubleClick={() => handleRowDoubleClick(item.visitId)}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(item.visitId)}
                            onChange={(e) => handleRowSelect(item.visitId, e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.visitId}</TableCell>
                        <TableCell>{item.visitDate}</TableCell>
                        <TableCell>{item.patientName}</TableCell>
                        <TableCell>{item.empiId}</TableCell>
                        <TableCell>{item.doctorName}</TableCell>
                        <TableCell>{item.visitType}</TableCell>
                        <TableCell>{item.fees}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs px-2 py-1 whitespace-nowrap ${getStatusBadgeClass(item.status)}`}>
                            {item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination (fixed) */}
            <div className="px-6 py-4 flex items-center justify-between bg-[hsl(var(--bg-10))] border-t border-[hsl(var(--stroke-grey))] flex-shrink-0 rounded-lg">
              <div className="text-sm text-[hsl(var(--text-80))]">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="text-[hsl(var(--text-80))] hover:text-[hsl(var(--text-100))] border-[hsl(var(--stroke-grey))] hover:bg-[hsl(var(--bg-10))] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </Button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                    let pageNum: number
                    if (totalPages <= 5) pageNum = idx + 1
                    else if (currentPage <= 3) pageNum = idx + 1
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + idx
                    else pageNum = currentPage - 2 + idx
                    return (
                      <Button
                        key={idx}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 ${currentPage === pageNum ? 'bg-[hsl(var(--brand-primary))] text-white hover:bg-[hsl(var(--brand-primary))]' : 'text-[hsl(var(--text-80))] hover:text-[hsl(var(--text-100))] border-[hsl(var(--stroke-grey))] hover:bg-[hsl(var(--bg-10))]'}`}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="text-[hsl(var(--text-80))] hover:text-[hsl(var(--text-100))] border-[hsl(var(--stroke-grey))] hover:bg-[hsl(var(--bg-10))] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : (
          // Visit detail tab with AI panel split layout (provider/hospital)
          <div className="flex-1 flex min-h-0">
            {/* Main visit details */}
            <div className={`flex flex-col min-h-0 ${aiPanelOpen ? 'flex-[7]' : 'flex-1'}`}>
              <div className="flex-1 overflow-auto p-6 space-y-4 min-h-0">
            {(() => {
              const visit = initialRows.find(x => x.visitId === activeTab)
              if (!visit) return <div className="text-[hsl(var(--text-80))]">Visit not found</div>
              
              // For IPD - Delivery, show the same structure as insurer worklist claim details
              if (visit.visitType === 'IPD - Delivery') {
                // Find the corresponding claim data from Maria's details to maintain single source of truth
                const correspondingClaim = mariaDetails?.claims?.find(c => c.claimType === 'IPD - Delivery')
                const p = mariaDetails?.patientInfo || maria
                const initials = (p?.name || 'P').split(' ').slice(0,2).map(s => s[0]).join('').toUpperCase()
                
                return (
                  <div className="space-y-4">
                    {/* Action Buttons Bar - Provider specific actions */}
                    <div className="bg-white border border-[hsl(var(--stroke-grey))] rounded-lg p-4">
                      <div className="flex flex-wrap gap-2">
                        {/* Raise Claim Button */}
                        <Button
                          size="sm"
                          className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white"
                          onClick={() => {
                            setSelectedRows([visit.visitId])
                            setIsRaiseClaimModalOpen(true)
                          }}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Raise Claim
                        </Button>
                        
                        {/* Ask Tatva AI Button - opens right AI panel */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-gradient-to-r from-[hsl(var(--brand-primary))] to-purple-600 text-white border-0 hover:from-[hsl(var(--brand-primary))]/90 hover:to-purple-600/90"
                          onClick={() => {
                            setAiPanelVisitId(visit.visitId)
                            setAiPanelOpen(true)
                          }}
                        >
                          <Brain className="w-4 h-4 mr-2" />
                          Ask Tatva AI
                        </Button>
                      </div>
                    </div>
                    
                    {/* Patient Details Section - same as insurer worklist */}
                    <div className="bg-white border border-[hsl(var(--stroke-grey))] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-[hsl(var(--text-100))]">Patient Details</h3>
                      </div>
                      <div className="flex items-center gap-3 min-w-0 mb-3">
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-[hsl(var(--brand-primary))]/20 blur-sm" />
                          <div className="relative w-10 h-10 rounded-full bg-[hsl(var(--bg-10))] border border-[hsl(var(--stroke-grey))] flex items-center justify-center text-sm font-semibold text-[hsl(var(--brand-primary))]">
                            {initials}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[hsl(var(--text-100))] truncate">{p?.name || 'Patient'}</div>
                          <div className="text-xs text-[hsl(var(--text-80))] truncate">EMPI: {p?.empiId || '-'}</div>
                        </div>
                        <div className="ml-auto">
                          {(() => {
                            const displayStatus = rows.find(r => r.visitId === visit.visitId)?.status || visit.status
                            const cls = displayStatus === 'Approved'
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : displayStatus === 'Rejected'
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : displayStatus === 'Pending'
                                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                            return (
                              <Badge variant="outline" className={`text-xs px-2 py-1 whitespace-nowrap ${cls}`}>
                                Status: {displayStatus}
                              </Badge>
                            )
                          })()}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        <div>
                          <div className="text-xs text-[hsl(var(--text-80))]">Program</div>
                          <div className="text-sm font-medium">{p?.program || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[hsl(var(--text-80))]">Doctor</div>
                          <div className="text-sm font-medium truncate" title={p?.doctorName || ''}>{p?.doctorName || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[hsl(var(--text-80))]">Insurance</div>
                          <div className="text-sm font-medium">{p?.insuranceProvider || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[hsl(var(--text-80))]">Mobile</div>
                          <div className="text-sm font-medium">{p?.mobile || '-'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Visit and Procedure Details Section - same structure as claim details */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-white border border-[hsl(var(--stroke-grey))] rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-[hsl(var(--text-100))] mb-3">Visit and Procedure Details</h3>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs text-[hsl(var(--text-80))]">Visit ID</div>
                              <div className="text-sm font-medium">{visit.visitId}</div>
                            </div>
                            <div>
                              <div className="text-xs text-[hsl(var(--text-80))]">Date</div>
                              <div className="text-sm font-medium">{visit.visitDate}</div>
                            </div>
                            <div>
                              <div className="text-xs text-[hsl(var(--text-80))]">Provider</div>
                              <div className="text-sm font-medium truncate" title={visit.clinic}>{visit.clinic}</div>
                            </div>
                            <div>
                              <div className="text-xs text-[hsl(var(--text-80))]">Type</div>
                              <div className="text-sm font-medium">{visit.visitType}</div>
                            </div>
                          </div>
                          
                          {/* IPD-specific details - same as insurer worklist */}
                          <div className="border-t border-[hsl(var(--stroke-grey))] pt-3">
                            <div className="text-xs font-medium text-[hsl(var(--text-80))] mb-2">Procedure Details</div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-xs text-[hsl(var(--text-80))]">Admission Date</div>
                                <div className="text-sm font-medium">{visit.visitDate}</div>
                              </div>
                              <div>
                                <div className="text-xs text-[hsl(var(--text-80))]">Length of Stay</div>
                                <div className="text-sm font-medium">{visit.duration}</div>
                              </div>
                              <div>
                                <div className="text-xs text-[hsl(var(--text-80))]">Procedure</div>
                                <div className="text-sm font-medium">Normal Delivery</div>
                              </div>
                              <div>
                                <div className="text-xs text-[hsl(var(--text-80))]">Room Type</div>
                                <div className="text-sm font-medium">Private Room</div>
                              </div>
                            </div>
                            <div className="mt-2">
                              <div className="text-xs text-[hsl(var(--text-80))]">Notes</div>
                              <div className="text-xs text-[hsl(var(--text-100))] bg-[hsl(var(--bg-10))] p-2 rounded mt-1">{visit.notes}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Financials - same structure as insurer worklist */}
                      <div className="bg-white border border-[hsl(var(--stroke-grey))] rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-[hsl(var(--text-100))]">Financials</h3>
                        </div>
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <div className="text-xs text-[hsl(var(--text-80))]">Total Fees</div>
                              <div className="text-sm font-semibold">{visit.fees}</div>
                            </div>
                            <div>
                              <div className="text-xs text-[hsl(var(--text-80))]">Expected Claim</div>
                              <div className="text-sm font-semibold">{correspondingClaim?.amountClaimed || visit.fees}</div>
                            </div>
                            <div>
                              <div className="text-xs text-[hsl(var(--text-80))]">Status</div>
                              <div className="text-sm font-semibold">{visit.status}</div>
                            </div>
                          </div>

                          {/* Expected reimbursement breakdown */}
                          <div>
                            <div className="text-xs font-medium text-[hsl(var(--text-80))] mb-1">Expected Breakdown</div>
                            <ul className="text-sm text-[hsl(var(--text-80))] space-y-1">
                              <li>• PhilHealth case rate: ₱32,000</li>
                              <li>• Private room charges: ₱25,000</li>
                              <li>• Professional fees: ₱15,000</li>
                              <li>• Medications and supplies: ₱13,000</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Documents Section - same structure as insurer worklist */}
                    <div className="bg-white border border-[hsl(var(--stroke-grey))] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-[hsl(var(--text-100))]">Documents</h3>
                      </div>
                      
                      {(() => {
                        // Use documents from corresponding claim if available, otherwise default IPD documents
                        const documents = correspondingClaim?.documents || [
                          'discharge_summary_2025-05-25.pdf',
                          'birth_certificate_baby_silva.pdf', 
                          'delivery_room_notes.pdf',
                          'hospital_bill_ipd.pdf',
                          'room_charges_bill.pdf',
                          'pharmacy_bill_ipd.pdf',
                          'pre_natal_records.pdf',
                          'lab_reports_delivery.pdf',
                          'philhealth_case_rate_form.pdf'
                        ]
                        
                        return (
                          <div className="space-y-4">
                            <div className="flex items-center gap-4 text-xs text-[hsl(var(--text-80))]">
                              <span>Total: {documents.length}</span>
                              <span>Required for claim submission</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {documents.map((doc, i) => (
                                <div 
                                  key={i} 
                                  className="p-3 rounded-lg border border-[hsl(var(--stroke-grey))] bg-[hsl(var(--bg-10))] transition-all hover:shadow-sm"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <FileText className="w-4 h-4 text-[hsl(var(--brand-primary))]" />
                                    <span className="text-sm font-medium text-[hsl(var(--text-100))] truncate flex-1" title={doc}>
                                      {doc.split('_').slice(0, 3).join(' ').replace('.pdf', '')}
                                    </span>
                                  </div>
                                  <div className="text-xs text-[hsl(var(--text-80))]">
                                    Ready for claim
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )
              }
              
              // For diagnostic visits, show detailed view similar to other claims
              if (visit.visitType.startsWith('Diagnostics -')) {
                const p = mariaDetails?.patientInfo || maria
                const initials = (p?.name || 'P').split(' ').slice(0,2).map(s => s[0]).join('').toUpperCase()
                const testName = visit.visitType.replace('Diagnostics - ', '')
                
                return (
                  <div className="space-y-4">
                    {/* Action Buttons Bar - Provider specific actions */}
                    <div className="bg-white border border-[hsl(var(--stroke-grey))] rounded-lg p-4">
                      <div className="flex flex-wrap gap-2">
                        {/* Raise Claim Button */}
                        <Button
                          size="sm"
                          className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white"
                          onClick={() => {
                            setSelectedRows([visit.visitId])
                            setIsRaiseClaimModalOpen(true)
                          }}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Raise Claim
                        </Button>
                        
                        {/* Ask Tatva AI Button - opens right AI panel */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-gradient-to-r from-[hsl(var(--brand-primary))] to-purple-600 text-white border-0 hover:from-[hsl(var(--brand-primary))]/90 hover:to-purple-600/90"
                          onClick={() => {
                            setAiPanelVisitId(visit.visitId)
                            setAiPanelOpen(true)
                          }}
                        >
                          <Brain className="w-4 h-4 mr-2" />
                          Ask Tatva AI
                        </Button>
                      </div>
                    </div>
                    
                    {/* Patient Details Section */}
                    <div className="bg-white border border-[hsl(var(--stroke-grey))] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-[hsl(var(--text-100))]">Patient Details</h3>
                      </div>
                      <div className="flex items-center gap-3 min-w-0 mb-3">
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-[hsl(var(--brand-primary))]/20 blur-sm" />
                          <div className="relative w-10 h-10 rounded-full bg-[hsl(var(--bg-10))] border border-[hsl(var(--stroke-grey))] flex items-center justify-center text-sm font-semibold text-[hsl(var(--brand-primary))]">
                            {initials}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[hsl(var(--text-100))] truncate">{p?.name || 'Patient'}</div>
                          <div className="text-xs text-[hsl(var(--text-80))] truncate">EMPI: {p?.empiId || '-'}</div>
                        </div>
                        <div className="ml-auto">
                          {(() => {
                            const displayStatus = rows.find(r => r.visitId === visit.visitId)?.status || visit.status
                            const cls = displayStatus === 'Approved'
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : displayStatus === 'Rejected'
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : displayStatus === 'Pending'
                                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                            return (
                              <Badge variant="outline" className={`text-xs px-2 py-1 whitespace-nowrap ${cls}`}>
                                Status: {displayStatus}
                              </Badge>
                            )
                          })()}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        <div>
                          <div className="text-xs text-[hsl(var(--text-80))]">Program</div>
                          <div className="text-sm font-medium">{p?.program || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[hsl(var(--text-80))]">Doctor</div>
                          <div className="text-sm font-medium truncate" title={p?.doctorName || ''}>{p?.doctorName || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[hsl(var(--text-80))]">Insurance</div>
                          <div className="text-sm font-medium">{p?.insuranceProvider || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[hsl(var(--text-80))]">Mobile</div>
                          <div className="text-sm font-medium">{p?.mobile || '-'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Diagnostic Test Details Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-white border border-[hsl(var(--stroke-grey))] rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-[hsl(var(--text-100))] mb-3">Diagnostic Test Details</h3>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs text-[hsl(var(--text-80))]">Visit ID</div>
                              <div className="text-sm font-medium">{visit.visitId}</div>
                            </div>
                            <div>
                              <div className="text-xs text-[hsl(var(--text-80))]">Date</div>
                              <div className="text-sm font-medium">{visit.visitDate}</div>
                            </div>
                            <div>
                              <div className="text-xs text-[hsl(var(--text-80))]">Lab</div>
                              <div className="text-sm font-medium truncate" title={visit.clinic}>{visit.clinic}</div>
                            </div>
                            <div>
                              <div className="text-xs text-[hsl(var(--text-80))]">Prescribed By</div>
                              <div className="text-sm font-medium">{visit.doctorName}</div>
                            </div>
                          </div>
                          
                          {/* Test-specific details */}
                          <div className="border-t border-[hsl(var(--stroke-grey))] pt-3">
                            <div className="text-xs font-medium text-[hsl(var(--text-80))] mb-2">Test Information</div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-xs text-[hsl(var(--text-80))]">Test Name</div>
                                <div className="text-sm font-medium">{testName}</div>
                              </div>
                              <div>
                                <div className="text-xs text-[hsl(var(--text-80))]">Category</div>
                                <div className="text-sm font-medium">
                                  {testName.includes('CBC') ? 'Blood' :
                                   testName.includes('HbA1c') ? 'Diabetes' :
                                   testName.includes('Vitamin') ? 'Vitamins' :
                                   testName.includes('TSH') ? 'Thyroid' :
                                   testName.includes('HIV') ? 'Infectious Disease' :
                                   testName.includes('Urine') ? 'Nephrology' :
                                   testName.includes('LH') || testName.includes('FSH') || testName.includes('AMH') ? 'Endocrinology' :
                                   'General'}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-[hsl(var(--text-80))]">Duration</div>
                                <div className="text-sm font-medium">{visit.duration}</div>
                              </div>
                              <div>
                                <div className="text-xs text-[hsl(var(--text-80))]">Test Fee</div>
                                <div className="text-sm font-medium">{visit.fees}</div>
                              </div>
                            </div>
                            <div className="mt-2">
                              <div className="text-xs text-[hsl(var(--text-80))]">Clinical Notes</div>
                              <div className="text-xs text-[hsl(var(--text-100))] bg-[hsl(var(--bg-10))] p-2 rounded mt-1">{visit.notes}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Financials */}
                      <div className="bg-white border border-[hsl(var(--stroke-grey))] rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-[hsl(var(--text-100))]">Financials</h3>
                        </div>
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <div className="text-xs text-[hsl(var(--text-80))]">Test Fee</div>
                              <div className="text-sm font-semibold">{visit.fees}</div>
                            </div>
                            <div>
                              <div className="text-xs text-[hsl(var(--text-80))]">Status</div>
                              <div className="text-sm font-semibold">{visit.status}</div>
                            </div>
                            <div>
                              <div className="text-xs text-[hsl(var(--text-80))]">Coverage</div>
                              <div className="text-sm font-semibold">Claimable</div>
                            </div>
                          </div>

                          {/* Test info */}
                          <div>
                            <div className="text-xs font-medium text-[hsl(var(--text-80))] mb-1">Test Information</div>
                            <ul className="text-sm text-[hsl(var(--text-80))] space-y-1">
                              <li>• {testName} performed at Reliance United Diagnostics</li>
                              <li>• Part of {p?.program || 'care'} program monitoring</li>
                              <li>• Results processed and documented</li>
                              <li>• Ready for insurance claim submission</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Test Documents Section */}
                    <div className="bg-white border border-[hsl(var(--stroke-grey))] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-[hsl(var(--text-100))]">Test Documents</h3>
                      </div>
                      
                      {(() => {
                        const documents = [
                          `${testName.toLowerCase().replace(/[^a-z0-9]+/g,'_')}_${visit.visitDate}.pdf`,
                          `lab_requisition_${visit.visitDate}.pdf`,
                          `test_results_${testName.toLowerCase().replace(/[^a-z0-9]+/g,'_')}.pdf`
                        ]
                        
                        return (
                          <div className="space-y-4">
                            <div className="flex items-center gap-4 text-xs text-[hsl(var(--text-80))]">
                              <span>Total: {documents.length}</span>
                              <span>Ready for claim submission</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {documents.map((doc, i) => (
                                <div 
                                  key={i} 
                                  className="p-3 rounded-lg border border-[hsl(var(--stroke-grey))] bg-[hsl(var(--bg-10))] transition-all hover:shadow-sm"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <FileText className="w-4 h-4 text-[hsl(var(--brand-primary))]" />
                                    <span className="text-sm font-medium text-[hsl(var(--text-100))] truncate flex-1" title={doc}>
                                      {doc.split('_').slice(0, 2).join(' ').replace('.pdf', '')}
                                    </span>
                                  </div>
                                  <div className="text-xs text-[hsl(var(--text-80))]">
                                    Ready for claim
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )
              }

              // For pharmacy visits, show detailed view similar to other claims
              if (visit.visitType.startsWith('Pharmacy -')) {
                const p = mariaDetails?.patientInfo || maria
                const initials = (p?.name || 'P').split(' ').slice(0,2).map(s => s[0]).join('').toUpperCase()
                const medicationName = visit.visitType.replace('Pharmacy - ', '')
                const medication = mariaDetails.medications.find(med => med.medicationName === medicationName)
                
                return (
                  <div className="space-y-4">
                    {/* Action Buttons Bar - Provider specific actions */}
                    <div className="bg-white border border-[hsl(var(--stroke-grey))] rounded-lg p-4">
                      <div className="flex flex-wrap gap-2">
                        {/* Raise Claim Button */}
                        <Button
                          size="sm"
                          className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white"
                          onClick={() => {
                            setSelectedRows([visit.visitId])
                            setIsRaiseClaimModalOpen(true)
                          }}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Raise Claim
                        </Button>
                        
                        {/* Ask Tatva AI Button - opens right AI panel */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-gradient-to-r from-[hsl(var(--brand-primary))] to-purple-600 text-white border-0 hover:from-[hsl(var(--brand-primary))]/90 hover:to-purple-600/90"
                          onClick={() => {
                            setAiPanelVisitId(visit.visitId)
                            setAiPanelOpen(true)
                          }}
                        >
                          <Brain className="w-4 h-4 mr-2" />
                          Ask Tatva AI
                        </Button>
                      </div>
                    </div>
                    
                    {/* Patient Details Section */}
                    <div className="bg-white border border-[hsl(var(--stroke-grey))] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-[hsl(var(--text-100))]">Patient Details</h3>
                      </div>
                      <div className="flex items-center gap-3 min-w-0 mb-3">
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-[hsl(var(--brand-primary))]/20 blur-sm" />
                          <div className="relative w-10 h-10 rounded-full bg-[hsl(var(--bg-10))] border border-[hsl(var(--stroke-grey))] flex items-center justify-center text-sm font-semibold text-[hsl(var(--brand-primary))]">
                            {initials}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[hsl(var(--text-100))] truncate">{p?.name || 'Patient'}</div>
                          <div className="text-xs text-[hsl(var(--text-80))] truncate">EMPI: {p?.empiId || '-'}</div>
                        </div>
                        <div className="ml-auto">
                          {(() => {
                            const displayStatus = rows.find(r => r.visitId === visit.visitId)?.status || visit.status
                            const cls = displayStatus === 'Approved'
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : displayStatus === 'Rejected'
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : displayStatus === 'Pending'
                                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                            return (
                              <Badge variant="outline" className={`text-xs px-2 py-1 whitespace-nowrap ${cls}`}>
                                Status: {displayStatus}
                              </Badge>
                            )
                          })()}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        <div>
                          <div className="text-xs text-[hsl(var(--text-80))]">Program</div>
                          <div className="text-sm font-medium">{p?.program || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[hsl(var(--text-80))]">Doctor</div>
                          <div className="text-sm font-medium truncate" title={p?.doctorName || ''}>{p?.doctorName || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[hsl(var(--text-80))]">Insurance</div>
                          <div className="text-sm font-medium">{p?.insuranceProvider || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[hsl(var(--text-80))]">Mobile</div>
                          <div className="text-sm font-medium">{p?.mobile || '-'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Medication Details Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-white border border-[hsl(var(--stroke-grey))] rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-[hsl(var(--text-100))] mb-3">Medication Details</h3>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs text-[hsl(var(--text-80))]">Visit ID</div>
                              <div className="text-sm font-medium">{visit.visitId}</div>
                            </div>
                            <div>
                              <div className="text-xs text-[hsl(var(--text-80))]">Date Filled</div>
                              <div className="text-sm font-medium">{visit.visitDate}</div>
                            </div>
                            <div>
                              <div className="text-xs text-[hsl(var(--text-80))]">Pharmacy</div>
                              <div className="text-sm font-medium truncate" title={visit.clinic}>{visit.clinic}</div>
                            </div>
                            <div>
                              <div className="text-xs text-[hsl(var(--text-80))]">Prescribed By</div>
                              <div className="text-sm font-medium">{visit.doctorName}</div>
                            </div>
                          </div>
                          
                          {/* Medication-specific details */}
                          <div className="border-t border-[hsl(var(--stroke-grey))] pt-3">
                            <div className="text-xs font-medium text-[hsl(var(--text-80))] mb-2">Prescription Information</div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-xs text-[hsl(var(--text-80))]">Medication</div>
                                <div className="text-sm font-medium">{medicationName}</div>
                              </div>
                              <div>
                                <div className="text-xs text-[hsl(var(--text-80))]">Dosage</div>
                                <div className="text-sm font-medium">{medication?.dosage || 'N/A'}</div>
                              </div>
                              <div>
                                <div className="text-xs text-[hsl(var(--text-80))]">Frequency</div>
                                <div className="text-sm font-medium">{medication?.frequency || 'N/A'}</div>
                              </div>
                              <div>
                                <div className="text-xs text-[hsl(var(--text-80))]">Route</div>
                                <div className="text-sm font-medium">{medication?.route || 'Oral'}</div>
                              </div>
                            </div>
                            <div className="mt-2">
                              <div className="text-xs text-[hsl(var(--text-80))]">Purpose & Notes</div>
                              <div className="text-xs text-[hsl(var(--text-100))] bg-[hsl(var(--bg-10))] p-2 rounded mt-1">{visit.notes}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Financials */}
                      <div className="bg-white border border-[hsl(var(--stroke-grey))] rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-[hsl(var(--text-100))]">Financials</h3>
                        </div>
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <div className="text-xs text-[hsl(var(--text-80))]">Medication Cost</div>
                              <div className="text-sm font-semibold">{visit.fees}</div>
                            </div>
                            <div>
                              <div className="text-xs text-[hsl(var(--text-80))]">Status</div>
                              <div className="text-sm font-semibold">{visit.status}</div>
                            </div>
                            <div>
                              <div className="text-xs text-[hsl(var(--text-80))]">Coverage</div>
                              <div className="text-sm font-semibold">
                                {medicationName.includes('Folic Acid') ? 'Not Covered' : 
                                 visit.status === 'Self-Pay' ? 'Not Covered' : 'Covered'}
                              </div>
                            </div>
                          </div>

                          {/* Coverage info */}
                          <div>
                            <div className="text-xs font-medium text-[hsl(var(--text-80))] mb-1">Coverage Information</div>
                            <ul className="text-sm text-[hsl(var(--text-80))] space-y-1">
                              {medicationName.includes('Folic Acid') ? (
                                <>
                                  <li>• ⚠️ Folic Acid is not covered by insurance</li>
                                  <li>• Patient pays full amount: {visit.fees}</li>
                                  <li>• Consider generic alternatives</li>
                                  <li>• Check patient assistance programs</li>
                                </>
                              ) : (
                                <>
                                  <li>• ✅ {medicationName} is covered by insurance</li>
                                  <li>• Part of {p?.program || 'care'} program benefits</li>
                                  <li>• Standard co-pay applies</li>
                                  <li>• Ready for insurance claim submission</li>
                                </>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Prescription Documents Section */}
                    <div className="bg-white border border-[hsl(var(--stroke-grey))] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-[hsl(var(--text-100))]">Prescription Documents</h3>
                      </div>
                      
                      {(() => {
                        const documents = [
                          `prescription_${medicationName.toLowerCase().replace(/[^a-z0-9]+/g,'_')}_${visit.visitDate}.pdf`,
                          `pharmacy_receipt_${visit.visitDate}.pdf`,
                          `medication_label_${medicationName.toLowerCase().replace(/[^a-z0-9]+/g,'_')}.pdf`
                        ]
                        
                        return (
                          <div className="space-y-4">
                            <div className="flex items-center gap-4 text-xs text-[hsl(var(--text-80))]">
                              <span>Total: {documents.length}</span>
                              <span>Ready for claim submission</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {documents.map((doc, i) => (
                                <div 
                                  key={i} 
                                  className="p-3 rounded-lg border border-[hsl(var(--stroke-grey))] bg-[hsl(var(--bg-10))] transition-all hover:shadow-sm"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <FileText className="w-4 h-4 text-[hsl(var(--brand-primary))]" />
                                    <span className="text-sm font-medium text-[hsl(var(--text-100))] truncate flex-1" title={doc}>
                                      {doc.split('_').slice(0, 2).join(' ').replace('.pdf', '')}
                                    </span>
                                  </div>
                                  <div className="text-xs text-[hsl(var(--text-80))]">
                                    Ready for claim
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )
              }

              // For other visit types, show simplified view
              return (
                <div className="space-y-4">
                  {/* Visit Details */}
                  <div className="bg-white border border-[hsl(var(--stroke-grey))] rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-[hsl(var(--text-100))] mb-3">Visit Details</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-[hsl(var(--text-80))]">Visit ID</div>
                        <div className="text-sm font-medium">{visit.visitId}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[hsl(var(--text-80))]">Date</div>
                        <div className="text-sm font-medium">{visit.visitDate}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[hsl(var(--text-80))]">Patient</div>
                        <div className="text-sm font-medium">{visit.patientName}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[hsl(var(--text-80))]">Doctor</div>
                        <div className="text-sm font-medium">{visit.doctorName}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[hsl(var(--text-80))]">Type</div>
                        <div className="text-sm font-medium">{visit.visitType}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[hsl(var(--text-80))]">Fees</div>
                        <div className="text-sm font-medium">{visit.fees}</div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="text-xs text-[hsl(var(--text-80))]">Notes</div>
                      <div className="text-sm text-[hsl(var(--text-100))] mt-1">{visit.notes}</div>
                    </div>
                  </div>
                </div>
              )
            })()}
              </div>
            </div>

            {/* AI Panel - provider context */}
            {aiPanelOpen && (
              <div className="flex-[3] border-l border-[hsl(var(--stroke-grey))]">
                {/* Lighter body gradient for contrast */}
                <div className="h-full flex flex-col bg-gradient-to-b from-purple-50 via-purple-100 to-purple-50">
                  {/* AI Panel Header - darker gradient */}
                  <div className="p-4 bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-white shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600 to-purple-800 text-white shadow">
                          <Brain className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">Tatva AI</h3>
                          <p className="text-xs opacity-90">Provider Claim Assistant</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/10"
                        onClick={() => setAiPanelOpen(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* AI Panel Content */}
                  <div className="flex-1 overflow-auto p-4">
                    {(() => {
                      const v = initialRows.find(x => x.visitId === aiPanelVisitId)
                      if (!v) return <div className="text-[hsl(var(--text-80))]">Visit not found</div>
                      const p = mariaDetails?.patientInfo || maria

                      // Build cross-visit coverage insights
                      const claims = mariaDetails?.claims || []
                      const meds = mariaDetails?.medications || []
                      const notCoveredMeds = meds.filter(m => (m.notes || '').toLowerCase().includes('non-claim')).map(m => m.medicationName)
                      const rejectedClaims = claims.filter(c => c.status === 'Rejected').map(c => `${c.claimType} (${c.submissionDate})`)
                      const needsInfoClaims = claims.filter(c => c.status === 'Submitted' || c.status === 'Under Review').map(c => `${c.claimType} (${c.submissionDate})`)
                      const completeClaims = claims.filter(c => c.status === 'Approved' || c.status === 'Reimbursed').map(c => `${c.claimType} (${c.submissionDate})`)

                      // Simple eligibility heuristics for current visit
                      const isPharmacy = v.visitType.startsWith('Pharmacy -')
                      const isIPD = v.visitType === 'IPD - Delivery'
                      const isDiagnostics = v.visitType.startsWith('Diagnostics')
                      const medName = isPharmacy ? v.visitType.replace('Pharmacy - ', '') : ''

                      return (
                        <div className="space-y-6">
                          {/* Context */}
                          <div className="text-sm text-[hsl(var(--text-100))]">
                            <div className="font-medium">{p?.name} • {p?.empiId}</div>
                            <div className="text-[hsl(var(--text-80))]">Visit {v.visitId} • {v.visitType}</div>
                          </div>

                          {/* What was reviewed */}
                          <div>
                            <div className="text-sm font-medium text-[hsl(var(--text-100))] mb-2">Reviewed</div>
                            <div className="text-sm space-y-1 text-[hsl(var(--text-80))]">
                              {isIPD ? (
                                <>
                                  <div>• Discharge summary and room charges</div>
                                  <div>• Pre-natal records and lab reports</div>
                                  <div>• PhilHealth case rate form</div>
                                </>
                              ) : isPharmacy ? (
                                <>
                                  <div>• Prescription and pharmacy receipt</div>
                                  <div>• Medication label and dosage</div>
                                  <div>• Prescriber and visit linkage</div>
                                </>
                              ) : (
                                <>
                                  <div>• Lab requisition</div>
                                  <div>• Test results and codes</div>
                                  <div>• Ordering physician details</div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Findings */}
                          <div className="bg-white/60 border border-[hsl(var(--stroke-grey))]/30 rounded-lg p-3">
                            <div className="text-sm font-medium text-[hsl(var(--text-100))] mb-2">Findings</div>
                            <div className="text-sm text-[hsl(var(--text-80))] space-y-1">
                              {isIPD ? (
                                <>
                                  <div>• Procedure: Normal Delivery. Provider in-network.</div>
                                  <div>• Private room charges may be partially covered.</div>
                                  <div>• Ensure ICD-10 coding and discharge summary completeness.</div>
                                </>
                              ) : isPharmacy ? (
                                medName.includes('Folic Acid') || medName.includes('Ferrous') ? (
                                  <>
                                    <div>• Medication covered under plan.</div>
                                    <div>• Standard co-pay applies.</div>
                                  </>
                                ) : (
                                  <>
                                    <div>• Medication typically not covered.</div>
                                    <div>• Consider alternatives or patient assistance.</div>
                                  </>
                                )
                              ) : (
                                <>
                                  <div>• Diagnostic test(s) generally claimable.</div>
                                  <div>• Standard co-pay and limits apply.</div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Eligibility highlights */}
                          <div>
                            <div className="text-sm font-medium text-[hsl(var(--text-100))] mb-2">Eligibility</div>
                            <div className="text-sm space-y-1">
                              {isPharmacy ? (
                                medName.includes('Folic Acid') || medName.includes('Ferrous') ? (
                                  <>
                                    <div className="text-green-600 font-medium">✓ Medication covered</div>
                                    <div className="text-green-600 font-medium">✓ Prescriber in-network</div>
                                    <div className="text-amber-600 font-medium">⚡ Co-pay applies</div>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-red-600 font-medium">✗ Medication not covered</div>
                                    <div className="text-green-600 font-medium">✓ Prescriber in-network</div>
                                    <div className="text-amber-600 font-medium">⚡ Self-pay likely</div>
                                  </>
                                )
                              ) : isIPD ? (
                                <>
                                  <div className="text-green-600 font-medium">✓ Procedure covered</div>
                                  <div className="text-green-600 font-medium">✓ Provider in-network</div>
                                  <div className="text-red-600 font-medium">✗ Full amount not covered</div>
                                </>
                              ) : (
                                <>
                                  <div className="text-green-600 font-medium">✓ Test(s) covered</div>
                                  <div className="text-green-600 font-medium">✓ Provider in-network</div>
                                  <div className="text-amber-600 font-medium">⚡ Co-pay applies</div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Cross-visit summary for Maria */}
                          <div className="bg-white/60 border border-[hsl(var(--stroke-grey))]/30 rounded-lg p-3">
                            <div className="text-sm font-semibold text-[hsl(var(--text-100))] mb-2">Maria’s Coverage Across Visits</div>
                            <div className="grid grid-cols-1 gap-2 text-sm">
                              <div>
                                <div className="text-xs text-[hsl(var(--text-80))]">Not covered (medicines)</div>
                                <div className="text-[hsl(var(--text-100))]">{notCoveredMeds.length ? notCoveredMeds.join(', ') : 'None detected'}</div>
                              </div>
                              <div>
                                <div className="text-xs text-[hsl(var(--text-80))]">Won’t work to claim</div>
                                <div className="text-[hsl(var(--text-100))]">{rejectedClaims.length ? rejectedClaims.join(', ') : 'None detected'}</div>
                              </div>
                              <div>
                                <div className="text-xs text-[hsl(var(--text-80))]">Needs more info</div>
                                <div className="text-[hsl(var(--text-100))]">{needsInfoClaims.length ? needsInfoClaims.join(', ') : 'Nothing pending additional info'}</div>
                              </div>
                              <div>
                                <div className="text-xs text-[hsl(var(--text-80))]">All info present</div>
                                <div className="text-[hsl(var(--text-100))]">{completeClaims.length ? completeClaims.join(', ') : 'No completed claims'}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Sticky Accept Recommendation Footer - darker gradient */}
                  <div className="p-4 bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-white border-t border-black/10">
                    {(() => {
                      const v = initialRows.find(x => x.visitId === aiPanelVisitId)
                      if (!v) return null
                      const isPharmacy = v.visitType.startsWith('Pharmacy -')
                      const medName = isPharmacy ? v.visitType.replace('Pharmacy - ', '') : ''
                      const eligibleAmount = isPharmacy
                        ? (medName.includes('Folic Acid') || medName.includes('Ferrous') ? '₱500' : '₱0')
                        : v.visitType === 'IPD - Delivery' ? '₱65,000' : '₱1,200'

                      return (
                        <>
                          {/* Eligible Amount */}
                          <div className="border border-white/20 rounded-lg p-4 text-center bg-white/10 mb-4">
                            <div className="text-sm text-white/90">Eligible Amount</div>
                            <div className="text-2xl font-bold text-white">{eligibleAmount}</div>
                            <div className="text-xs text-white/80">Provider-side estimate</div>
                          </div>
                          <Button
                            size="sm"
                            className="w-full text-white font-semibold bg-gradient-to-r from-violet-500 via-fuchsia-500 to-purple-600 hover:from-violet-600 hover:via-fuchsia-600 hover:to-purple-700 shadow-lg border-2 border-white ring-1 ring-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                            onClick={() => {
                              // Mark as Approved to reflect acceptance in the badge immediately
                              setRows(prev => prev.map(r => r.visitId === v.visitId ? { ...r, status: 'Approved' } : r))

                              // Build a compact summary string
                              const claims = mariaDetails?.claims || []
                              const meds = mariaDetails?.medications || []
                              const notCoveredMeds = meds.filter(m => (m.notes || '').toLowerCase().includes('non-claim')).map(m => m.medicationName)
                              const needsInfo = claims.filter(c => c.status === 'Submitted' || c.status === 'Under Review').map(c => c.claimType)
                              const complete = claims.filter(c => c.status === 'Approved' || c.status === 'Reimbursed').map(c => c.claimType)

                              toast.success('Recommendation Accepted', {
                                description: `Visit ${v.visitId} approved • Eligible: ${eligibleAmount} • Not covered: ${notCoveredMeds.slice(0,2).join('/') || 'None'} • Needs info: ${needsInfo.slice(0,2).join('/') || 'None'} • Complete: ${complete.slice(0,2).join('/') || 'None'}`,
                              })
                              setAiPanelOpen(false)
                            }}
                          >
                            Accept Recommendation
                          </Button>
                        </>
                      )
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Raise Claim Modal */}
      <RaiseClaimModal
        open={isRaiseClaimModalOpen}
        onOpenChange={setIsRaiseClaimModalOpen}
        visitIds={selectedRows}
        visits={rows.filter(r => selectedRows.includes(r.visitId))}
        onClaimSubmitted={handleClaimSubmitted}
      />
    </div>
  )
}
