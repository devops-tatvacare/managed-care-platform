"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { X, ChevronDown, Phone, MessageCircle, CheckCircle2, XCircle, Link2, UserCheck, Brain, FileText } from "lucide-react"
import { getStatusBadgeClass } from "@/utils/badge-styles"
import SearchBox from "./search-box"
import { generatePatientsData } from "@/lib/generate-patients-data"
import { generatePatientDetailsData } from "@/lib/generate-patient-details-data"
import { toast } from "sonner"
import WorklistChatPopup from "@/components/worklist-chat-popup"
import LinkDocumentsModal from "@/components/link-documents-modal"
import PatientDetailTabs from "@/components/patient-detail-tabs"

const basePatients = generatePatientsData(1000)
const maria = basePatients.find(p => p.empiId === "EMPI999901")
const mariaDetails = maria ? generatePatientDetailsData("EMPI999901", maria) : null

const searchFields = [
  { key: "id", label: "Claim ID", type: "text" as const },
  { key: "status", label: "Status", type: "select" as const, options: [
    { value: "all", label: "All Statuses" },
    { value: "Pending", label: "Pending" },
    { value: "Submitted", label: "Submitted" },
    { value: "Under Review", label: "Under Review" },
    { value: "Approved", label: "Approved" },
    { value: "Reimbursed", label: "Reimbursed" },
    { value: "Rejected", label: "Rejected" },
  ]},
  { key: "claimType", label: "Type", type: "text" as const },
  { key: "hospital", label: "Provider", type: "text" as const },
  { key: "name", label: "Patient Name", type: "text" as const },
  { key: "empiId", label: "EMPI ID", type: "text" as const },
]

type Row = {
  id: string
  submissionDate: string
  status: string
  claimType: string
  hospital: string
  insuranceProvider: string
  amountClaimed: string
  amountReimbursed: string
  reviewedBy: string
  documents: string[]
  name: string
  empiId: string
}

const initialRows: Row[] = (mariaDetails?.claims || []).map(c => ({
  id: c.id,
  submissionDate: c.submissionDate,
  status: c.status,
  claimType: c.claimType,
  hospital: c.hospital,
  insuranceProvider: c.insuranceProvider,
  amountClaimed: c.amountClaimed,
  amountReimbursed: c.amountReimbursed,
  reviewedBy: c.reviewedBy,
  documents: c.documents,
  name: maria?.name || "Maria Silva",
  empiId: maria?.empiId || "EMPI999901",
}))

// Mark a few claims as Pending and sort to show Pending at the top
const baseRows: Row[] = (() => {
  const rows = [...initialRows]
  const count = Math.min(2, rows.length)
  for (let i = 0; i < count; i++) rows[i] = { ...rows[i], status: "Pending" }
  rows.sort((a, b) => {
    if (a.status === "Pending" && b.status !== "Pending") return -1
    if (b.status === "Pending" && a.status !== "Pending") return 1
    return new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime()
  })
  return rows
})()

const actionButtons = [
  { id: "approve", label: "Approve", icon: CheckCircle2, variant: "outline" as const },
  { id: "reject", label: "Reject", icon: XCircle, variant: "outline" as const },
  { id: "call", label: "Call", icon: Phone, variant: "outline" as const },
  { id: "chat", label: "Chat", icon: MessageCircle, variant: "outline" as const },
  { id: "assign", label: "Assign", icon: UserCheck, variant: "outline" as const },
  { id: "link", label: "Link", icon: Link2, variant: "outline" as const },
]

export default function WorklistScreen() {
  const [rows, setRows] = useState<Row[]>(baseRows)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [openTabs, setOpenTabs] = useState<string[]>([])
  const [openPatientTabs, setOpenPatientTabs] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("worklist")
  const [visibleTabsCount, setVisibleTabsCount] = useState(0)
  const [showTabDropdown, setShowTabDropdown] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)
  const itemsPerPage = 50
  const [currentPage, setCurrentPage] = useState(1)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMode, setChatMode] = useState<"chat" | "call">("chat")
  const [chatContextClaims, setChatContextClaims] = useState<string[]>([])
  const [isLinkDocumentsModalOpen, setIsLinkDocumentsModalOpen] = useState(false)
  const [linkedDocuments, setLinkedDocuments] = useState<Record<string, string[]>>({})
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [aiPanelClaimId, setAiPanelClaimId] = useState<string>('')

  const allOpenTabs = useMemo(() => {
    const claimTabs = openTabs.map(id => ({ type: 'claim' as const, id, label: `Claim ${id}` }));
    const patientTabs = openPatientTabs.map(id => {
        const patient = basePatients.find(p => p.empiId === id);
        return { type: 'patient' as const, id, label: patient?.name || id };
    });
    return [...claimTabs, ...patientTabs];
  }, [openTabs, openPatientTabs]);

  // Compute how many tabs fit in the nav
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
      
      const labels = allOpenTabs.map(tab => tab.label)
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
  }, [allOpenTabs])

  useEffect(() => {
    const handleClickOutside = () => {
      if (showTabDropdown) setShowTabDropdown(false)
    }
    if (showTabDropdown) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showTabDropdown])

  const handleSearch = (filters: Record<string, string>) => {
    const filtered = baseRows.filter(r => {
      if (filters.id && !r.id.toLowerCase().includes(filters.id.toLowerCase())) return false
      if (filters.status && filters.status !== 'all' && r.status !== filters.status) return false
      if (filters.claimType && !r.claimType.toLowerCase().includes(filters.claimType.toLowerCase())) return false
      if (filters.hospital && !r.hospital.toLowerCase().includes(filters.hospital.toLowerCase())) return false
      if (filters.name && !r.name.toLowerCase().includes(filters.name.toLowerCase())) return false
      if (filters.empiId && !r.empiId.toLowerCase().includes(filters.empiId.toLowerCase())) return false
      return true
    })
    setRows(filtered)
    setCurrentPage(1)
  }

  const handleRowDoubleClick = (claimId: string) => {
    if (!openTabs.includes(claimId)) setOpenTabs(prev => [...prev, claimId])
    setActiveTab(claimId)
  }

  const handleCloseTab = (tabId: string) => {
    setOpenTabs(prev => prev.filter(id => id !== tabId))
    if (activeTab === tabId) setActiveTab("worklist")
  }

  const handleShowPatientDetails = (empiId: string) => {
    if (!openPatientTabs.includes(empiId)) {
      setOpenPatientTabs(prev => [...prev, empiId]);
    }
    setActiveTab(empiId);
  };

  const handleClosePatientTab = (tabId: string) => {
    setOpenPatientTabs(prev => prev.filter(id => id !== tabId));
    if (activeTab === tabId) {
      setActiveTab("worklist");
    }
  };
  const handleRowSelect = (claimId: string, selected: boolean) => {
    setSelectedRows(prev => selected ? [...prev, claimId] : prev.filter(id => id !== claimId))
  }

  const handleActionClick = (actionId: string) => {
    if (selectedRows.length === 0) return
    // Show toasts and optimistically update status for approve/reject
    if (actionId === "approve") {
      setRows(prev => prev.map(r => selectedRows.includes(r.id) ? { ...r, status: "Approved" } : r))
      toast.success("Claim(s) approved", {
        description: `${selectedRows.length} claim${selectedRows.length > 1 ? 's' : ''} updated`,
      })
      setSelectedRows([])
      return
    }
    if (actionId === "reject") {
      setRows(prev => prev.map(r => selectedRows.includes(r.id) ? { ...r, status: "Rejected" } : r))
      toast.error("Claim(s) rejected", {
        description: `${selectedRows.length} claim${selectedRows.length > 1 ? 's' : ''} updated`,
      })
      setSelectedRows([])
      return
    }
    // Placeholder for other actions (call/chat/assign/link)
    if (actionId === "chat" || actionId === "call") {
      setChatMode(actionId === "chat" ? "chat" : "call")
      setChatContextClaims(selectedRows)
      setChatOpen(true)
      return
    }
    if (actionId === "link") {
      setIsLinkDocumentsModalOpen(true)
      return
    }
  }

  const visibleTabs = allOpenTabs.slice(0, visibleTabsCount)
  const overflowTabs = allOpenTabs.slice(visibleTabsCount)
  const totalPages = Math.ceil(rows.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedRows = rows.slice(startIndex, startIndex + itemsPerPage)


  const getActionButtonClass = (id: string, disabled: boolean) => {
    // Never fade background on disabled; keep solid colors (no translucency)
    const base = "!h-9 disabled:opacity-100 disabled:cursor-not-allowed"
    if (id === 'approve') {
      const enabled = "!text-white !bg-green-600 hover:!bg-green-700"
      const disabledCls = "disabled:!bg-green-300 disabled:!text-white"
      return `${base} ${enabled} ${disabledCls}`
    }
    if (id === 'reject') {
      const enabled = "!text-white !bg-red-600 hover:!bg-red-700"
      const disabledCls = "disabled:!bg-red-300 disabled:!text-white"
      return `${base} ${enabled} ${disabledCls}`
    }
    // Secondary style (purple border, white bg, purple text) for all others
    const secondaryEnabled = "!bg-white !text-[hsl(var(--brand-primary))] !border !border-[hsl(var(--brand-primary))] hover:!bg-[hsl(var(--bg-10))]"
    const secondaryDisabled = "disabled:!bg-white disabled:!text-[hsl(var(--text-80))] disabled:!border disabled:!border-[hsl(var(--stroke-grey))]"
    return `${base} ${disabled ? secondaryDisabled : secondaryEnabled}`
  }
  return (
    <div className="flex h-full flex-col min-h-0">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-stroke">
        <div ref={navRef} className="flex items-center h-full overflow-hidden">
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 h-full flex items-center ${
              activeTab === "worklist"
                ? "border-brand text-brand"
                : "border-transparent text-text80 hover:text-text100"
            }`}
            onClick={() => setActiveTab("worklist")}
          >
            Worklist
          </button>

          {visibleTabs.map((tab) => (
            <div key={tab.id} className="flex items-center h-full">
              <button
                className={`px-4 py-3 text-sm font-medium border-b-2 h-full flex items-center ${
                  activeTab === tab.id
                    ? "border-brand text-brand"
                    : "border-transparent text-text80 hover:text-text100"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (tab.type === 'claim') {
                    handleCloseTab(tab.id)
                  } else {
                    handleClosePatientTab(tab.id)
                  }
                }}
                className="ml-1 p-1 hover:bg-bg10 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {overflowTabs.length > 0 && (
            <div className="relative h-full">
              <button
                className="px-4 py-3 text-sm font-medium border-b-2 border-transparent text-text80 hover:text-text100 h-full flex items-center gap-1"
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
                  className="absolute top-full left-0 mt-1 bg-white border border-stroke rounded-lg shadow-xl z-[9999] min-w-48"
                  onClick={(e) => e.stopPropagation()}
                >
                  {overflowTabs.map((tab) => (
                    <div
                      key={tab.id}
                      className="flex items-center hover:bg-bg10 border-b border-stroke last:border-b-0"
                    >
                      <button
                        className={`flex-1 px-4 py-3 text-left text-sm ${
                          activeTab === tab.id ? "text-brand font-medium" : "text-text100"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveTab(tab.id)
                          setShowTabDropdown(false)
                        }}
                      >
                        {tab.label}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (tab.type === 'claim') {
                            handleCloseTab(tab.id)
                          } else {
                            handleClosePatientTab(tab.id)
                          }
                        }}
                        className="p-2 hover:bg-bg10 rounded mr-2"
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
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-bg100">
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
                      variant={action.id === 'approve' || action.id === 'reject' ? 'default' : 'outline'}
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
            {/* Claims Table (scrolls) */}
            <div className="flex-1 px-6 min-h-0 flex flex-col">
              <div className="bg-white border border-stroke rounded-lg flex-1 min-h-0 overflow-auto">
                <div className="min-h-full">
                  <Table className="w-full">
                    <TableHeader className="sticky top-0 bg-[hsl(var(--bg-10))] z-10">
                      <TableRow>
                        <TableHead className="sticky top-0 bg-[hsl(var(--bg-10))] z-10 w-12">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRows(rows.map((r) => r.id))
                              } else {
                                setSelectedRows([])
                              }
                            }}
                            checked={rows.length > 0 && selectedRows.length === rows.length}
                          />
                        </TableHead>
                        <TableHead className="sticky top-0 bg-[hsl(var(--bg-10))] z-10">Claim ID</TableHead>
                        <TableHead className="sticky top-0 bg-[hsl(var(--bg-10))] z-10">Submission Date</TableHead>
                        <TableHead className="sticky top-0 bg-[hsl(var(--bg-10))] z-10">Patient</TableHead>
                        <TableHead className="sticky top-0 bg-[hsl(var(--bg-10))] z-10">EMPI ID</TableHead>
                        <TableHead className="sticky top-0 bg-[hsl(var(--bg-10))] z-10">Status</TableHead>
                        <TableHead className="sticky top-0 bg-[hsl(var(--bg-10))] z-10">Type</TableHead>
                        <TableHead className="sticky top-0 bg-[hsl(var(--bg-10))] z-10">Provider</TableHead>
                        <TableHead className="sticky top-0 bg-[hsl(var(--bg-10))] z-10">Amount Claimed</TableHead>
                        <TableHead className="sticky top-0 bg-[hsl(var(--bg-10))] z-10">Amount Reimbursed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRows.map((item) => (
                        <TableRow
                          key={item.id}
                          className="cursor-pointer hover:bg-bg10"
                          onDoubleClick={() => handleRowDoubleClick(item.id)}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedRows.includes(item.id)}
                              onChange={(e) => handleRowSelect(item.id, e.target.checked)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{item.id}</TableCell>
                          <TableCell>{item.submissionDate}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.empiId}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs px-2 py-1 whitespace-nowrap ${getStatusBadgeClass(item.status)}`}>
                          {item.status}
                        </Badge>
                      </TableCell>
                          <TableCell>{item.claimType}</TableCell>
                          <TableCell>{item.hospital}</TableCell>
                          <TableCell>{item.amountClaimed}</TableCell>
                          <TableCell>{item.amountReimbursed}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {/* Pagination (fixed) */}
            <div className="px-6 py-4 flex items-center justify-between bg-[hsl(var(--bg-10))] border-t border-[hsl(var(--stroke-grey))] flex-shrink-0">
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
        ) : openTabs.includes(activeTab) ? (
          // Claim detail tab with AI panel split layout
          <div className="flex-1 flex min-h-0">
            {/* Main claim details */}
            <div className={`flex flex-col min-h-0 ${aiPanelOpen ? 'flex-[7]' : 'flex-1'}`}>
              <div className="flex-1 overflow-auto p-6 space-y-4 min-h-0">
            {(() => {
              const c = (mariaDetails?.claims || []).find(x => x.id === activeTab)
              if (!c) return <div className="text-text80">Claim not found</div>
              return (
                <div className="space-y-4">
                  {/* Unified Action Buttons Bar */}
                  <div className="bg-white border border-[hsl(var(--stroke-grey))] rounded-lg p-4">
                    <div className="flex flex-wrap gap-2">
                      {/* Approve Button */}
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => {
                          setRows(prev => prev.map(r => 
                            r.id === c.id 
                              ? { ...r, status: "Approved" } 
                              : r
                          ))
                          toast.success("Claim approved", {
                            description: `Claim ${c.id} has been approved`,
                          })
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      
                      {/* Reject Button */}
                      <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => {
                          setRows(prev => prev.map(r => 
                            r.id === c.id 
                              ? { ...r, status: "Rejected" } 
                              : r
                          ))
                          toast.error("Claim rejected", {
                            description: `Claim ${c.id} has been rejected`,
                          })
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                      
                      {/* Call Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[hsl(var(--brand-primary))] border-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))] hover:text-white"
                        onClick={() => {
                          setChatMode('call')
                          setChatContextClaims([c.id])
                          setChatOpen(true)
                        }}
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Call
                      </Button>
                      
                      {/* Chat Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[hsl(var(--brand-primary))] border-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))] hover:text-white"
                        onClick={() => {
                          setChatMode('chat')
                          setChatContextClaims([c.id])
                          setChatOpen(true)
                        }}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Chat
                      </Button>
                      
                      {/* Link Documents Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[hsl(var(--brand-primary))] border-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))] hover:text-white"
                        onClick={() => {
                          setSelectedRows([c.id])
                          setIsLinkDocumentsModalOpen(true)
                        }}
                      >
                        <Link2 className="w-4 h-4 mr-2" />
                        Link Documents
                      </Button>
                      
                      {/* AI Mode Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-gradient-to-r from-[hsl(var(--brand-primary))] to-purple-600 text-white border-0 hover:from-[hsl(var(--brand-primary))]/90 hover:to-purple-600/90 animate-gradient-x"
                        onClick={() => {
                          setAiPanelClaimId(c.id)
                          setAiPanelOpen(true)
                        }}
                      >
                        <Brain className="w-4 h-4 mr-2" />
                        Ask Tatva AI
                      </Button>
                    </div>
                  </div>
                  
                  {/* Patient Details Section */}
                  {(() => {
                    const p = mariaDetails?.patientInfo || maria
                    const initials = (p?.name || 'P').split(' ').slice(0,2).map(s => s[0]).join('').toUpperCase()
                    return (
                      <div className="bg-white border border-stroke rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-text100">Patient Details</h3>
                          <Button
                            variant="outline"
                            size="sm"
                                  onClick={() => handleShowPatientDetails(p?.empiId || "")}
                            className="text-xs h-7 px-3 text-[hsl(var(--brand-primary))] border-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))] hover:text-white"
                          >
                            Show More
                          </Button>
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
                              const displayStatus = rows.find(r => r.id === c.id)?.status || c.status
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
                            <div className="text-xs text-text80">Program</div>
                            <div className="text-sm font-medium">{p?.program || '-'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-text80">Doctor</div>
                            <div className="text-sm font-medium truncate" title={p?.doctorName || ''}>{p?.doctorName || '-'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-text80">Insurance</div>
                            <div className="text-sm font-medium">{p?.insuranceProvider || c.insuranceProvider || '-'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-text80">Mobile</div>
                            <div className="text-sm font-medium">{p?.mobile || '-'}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                  {/* Claim and Procedure Details Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Claim and Procedure Details */}
                    <div className="bg-white border border-stroke rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-text100 mb-3">
                        {c.claimType.includes('IPD') ? 'Claim and Procedure Details' : c.claimType.includes('Lab') ? 'Claim and Labs Details' : 'Claim and Procedure Details'}
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-text80">Claim ID</div>
                            <div className="text-sm font-medium">{c.id}</div>
                          </div>
                          <div>
                            <div className="text-xs text-text80">Submitted</div>
                            <div className="text-sm font-medium">{c.submissionDate}</div>
                          </div>
                          <div>
                            <div className="text-xs text-text80">Provider</div>
                            <div className="text-sm font-medium truncate" title={c.hospital}>{c.hospital}</div>
                          </div>
                          <div>
                            <div className="text-xs text-text80">Type</div>
                            <div className="text-sm font-medium">{c.claimType}</div>
                          </div>
                        </div>
                        
                        {/* IPD-specific details */}
                        {c.claimType.includes('IPD') && (
                          <div className="border-t border-[hsl(var(--stroke-grey))] pt-3">
                            <div className="text-xs font-medium text-text80 mb-2">Procedure Details</div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-xs text-text80">Admission Date</div>
                                <div className="text-sm font-medium">{c.submissionDate}</div>
                              </div>
                              <div>
                                <div className="text-xs text-text80">Length of Stay</div>
                                <div className="text-sm font-medium">3 days</div>
                              </div>
                              <div>
                                <div className="text-xs text-text80">Procedure</div>
                                <div className="text-sm font-medium">Normal Delivery</div>
                              </div>
                              <div>
                                <div className="text-xs text-text80">Room Type</div>
                                <div className="text-sm font-medium">Private Room</div>
                              </div>
                            </div>
                            <div className="mt-2">
                              <div className="text-xs text-text80">Discharge Summary</div>
                              <div className="text-xs text-text100 bg-[hsl(var(--bg-10))] p-2 rounded mt-1">Normal delivery completed without complications. Mother and baby discharged in stable condition. Follow-up recommended in 2 weeks.</div>
                            </div>
                          </div>
                        )}
                        
                        {/* Lab-specific details */}
                        {c.claimType.includes('Lab') && (
                          <div className="border-t border-[hsl(var(--stroke-grey))] pt-3">
                            <div className="text-xs font-medium text-text80 mb-2">Labs Details</div>
                            <div className="text-xs text-text100 bg-[hsl(var(--bg-10))] p-2 rounded">
                              Tests performed: CBC, HbA1c, Vitamin D, Thyroid panel. All results within normal ranges for pregnancy.
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Compact timeline chips */}
                      {(() => {
                        const steps = ["Submitted", "Under Review", c.status === 'Rejected' ? 'Rejected' : 'Approved', "Reimbursed"]
                        const currentIdx = steps.findIndex(s => s === (c.status === 'Under Review' ? 'Under Review' : c.status === 'Rejected' ? 'Rejected' : c.status === 'Reimbursed' ? 'Reimbursed' : c.status === 'Approved' ? 'Approved' : 'Submitted'))
                        return (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {steps.map((s, i) => (
                              <span
                                key={s}
                                className={`text-xs px-2 py-1 rounded-full border ${i <= currentIdx ? 'bg-[hsl(var(--brand-primary))] text-white border-[hsl(var(--brand-primary))]' : 'bg-[hsl(var(--bg-10))] text-[hsl(var(--text-80))] border-[hsl(var(--stroke-grey))]'}`}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )
                      })()}
                    </div>

                    {/* Financials */}
                    <div className="bg-white border border-stroke rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-text100">Financials</h3>
                      </div>
                      {(() => {
                        const claimed = Number((c.amountClaimed || "0").replace(/[^\d.]/g, "")) || 0
                        const reimb = Number((c.amountReimbursed || "0").replace(/[^\d.]/g, "")) || 0
                        const pending = Math.max(0, claimed - reimb)
                        const pct = claimed ? Math.round((reimb / claimed) * 100) : 0
                        return (
                          <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <div className="text-xs text-text80">Claimed</div>
                                <div className="text-sm font-semibold">{c.amountClaimed}</div>
                              </div>
                              <div>
                                <div className="text-xs text-text80">Reimbursed</div>
                                <div className="text-sm font-semibold">{c.amountReimbursed || '-'}</div>
                              </div>
                              <div>
                                <div className="text-xs text-text80">Pending</div>
                                <div className="text-sm font-semibold">{pending ? `₱${pending.toLocaleString()}` : '-'}</div>
                              </div>
                            </div>
                            <div>
                              <div className="h-2 rounded bg-[hsl(var(--bg-10))] border border-[hsl(var(--stroke-grey))] overflow-hidden">
                                <div className="h-full bg-[hsl(var(--brand-primary))]" style={{ width: `${pct}%` }} />
                              </div>
                              <div className="text-xs text-text80 mt-1">{pct}% reimbursed</div>
                            </div>

                            {/* Recent activity */}
                            <div>
                              <div className="text-xs font-medium text-text80 mb-1">Recent Notes</div>
                              <ul className="text-sm text-text80 space-y-1">
                                <li>• Adjuster requested discharge summary and ICD-10 clarification.</li>
                                <li>• Provider uploaded lab results; discharge summary pending.</li>
                                <li>• Internal review flagged missing coding notes.</li>
                              </ul>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Documents Section */}
                  <div className="bg-white border border-stroke rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-text100">Documents</h3>
                    </div>
                    
                    {(() => {
                      const allDocuments = [...c.documents, ...(linkedDocuments[c.id] || [])]
                      const originalCount = c.documents.length
                      const linkedCount = linkedDocuments[c.id]?.length || 0
                      
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 text-xs text-[hsl(var(--text-80))]">
                            <span>Total: {allDocuments.length}</span>
                            <span>Original: {originalCount}</span>
                            {linkedCount > 0 && (
                              <span className="text-[hsl(var(--brand-primary))] font-medium">
                                Recently Linked: {linkedCount}
                              </span>
                            )}
                          </div>

                          {allDocuments.length === 0 ? (
                            <div className="text-center py-8 text-[hsl(var(--text-80))]">
                              <div className="text-sm">No documents linked to this claim</div>
                              <div className="text-xs mt-1">Click "Link Documents" to attach relevant files</div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {allDocuments.map((doc, i) => {
                                const isLinked = i >= originalCount
                                return (
                                  <div 
                                    key={i} 
                                    className={`p-3 rounded-lg border transition-all hover:shadow-sm ${
                                      isLinked 
                                        ? 'bg-[hsl(var(--brand-primary))]/5 border-[hsl(var(--brand-primary))]/20 hover:bg-[hsl(var(--brand-primary))]/10' 
                                        : 'bg-[hsl(var(--bg-10))] border-[hsl(var(--stroke-grey))] hover:bg-white'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-medium truncate ${
                                          isLinked ? 'text-[hsl(var(--brand-primary))]' : 'text-[hsl(var(--text-100))]'
                                        }`}>
                                          {doc}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                                            isLinked 
                                              ? 'bg-[hsl(var(--brand-primary))] text-white' 
                                              : 'bg-[hsl(var(--stroke-grey))] text-[hsl(var(--text-80))]'
                                          }`}>
                                            {isLinked ? 'Recently Linked' : 'Original'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>
                )
              })()}
              </div>
            </div>
            
            {/* AI Panel */}
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
                          <p className="text-xs opacity-90">Claim Analyzer</p>
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
                      const c = (mariaDetails?.claims || []).find(x => x.id === aiPanelClaimId)
                      if (!c) return <div className="text-[hsl(var(--text-80))]">Claim not found</div>
                      const p = mariaDetails?.patientInfo || maria
                      
                      return (
                        <div className="space-y-6">
                          {/* Context */}
                          <div className="text-sm text-[hsl(var(--text-100))]">
                            <div className="font-medium">{p?.name} • {p?.empiId}</div>
                            <div className="text-[hsl(var(--text-80))]">Claim {c.id} • {c.claimType}</div>
                          </div>
                          
                          {/* What was reviewed */}
                          <div>
                            <div className="text-sm font-medium text-[hsl(var(--text-100))] mb-2">Reviewed</div>
                            <div className="text-sm space-y-1 text-[hsl(var(--text-80))]">
                              {c.documents.slice(0,3).map((doc, i) => (
                                <div key={i}>• {doc}</div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Coverage */}
                          <div>
                            <div className="text-sm font-medium text-[hsl(var(--text-100))] mb-2">Coverage Analysis</div>
                            <div className="text-sm space-y-1">
                              {c.claimType.includes('Prescription Drugs') && c.notes.includes('Folic Acid') ? (
                                <>
                                  <div className="text-red-600 font-medium">⚠️ Folic Acid not covered</div>
                                  <div className="text-green-600 font-medium">✓ Ferrous Sulfate covered</div>
                                  <div className="text-amber-600 font-medium">⚡ Alternative recommended</div>
                                  <div className="text-sm text-[hsl(var(--text-80))] mt-2 p-2 bg-amber-50 rounded border">
                                    <strong>Recommendation:</strong> Folic Acid (₱350) is not covered. Patient should pay out-of-pocket or consider generic folate supplement. Iron supplement remains covered under maternal health benefits.
                                  </div>
                                </>
                              ) : c.claimType.includes('Prescription Drugs') ? (
                                <>
                                  <div className="text-red-600 font-medium">✗ Medications not covered</div>
                                  <div className="text-green-600 font-medium">✓ Provider in-network</div>
                                  <div className="text-amber-600 font-medium">⚡ Self-pay required</div>
                                </>
                              ) : (
                                <>
                                  <div className="text-green-600 font-medium">✓ Procedure covered</div>
                                  <div className="text-green-600 font-medium">✓ Provider in-network</div>
                                  <div className="text-red-600 font-medium">✗ Full amount not covered</div>
                                </>
                              )}
                            </div>
                          </div>
                          
                          </div>
                      )
                    })()}
                  </div>
                  
                  {/* Sticky Accept Recommendation Footer - darker gradient */}
                  <div className="p-4 bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-white border-t border-black/10">
                    {(() => {
                      const c = (mariaDetails?.claims || []).find(x => x.id === aiPanelClaimId)
                      if (!c) return null
                      
                      return (
                        <>
                          {/* Eligible Amount */}
                          <div className="border border-white/20 rounded-lg p-4 text-center bg-white/10 mb-4">
                            <div className="text-sm text-white/90">Eligible Amount</div>
                            <div className="text-2xl font-bold text-white">
                              {c.claimType.includes('Prescription Drugs') && c.notes.includes('Folic Acid') ? '₱500' :
                               c.claimType.includes('Prescription Drugs') ? '₱0' : '₱65,000'}
                            </div>
                            <div className="text-sm text-white/80">of {c.amountClaimed}</div>
                            {c.claimType.includes('Prescription Drugs') && c.notes.includes('Folic Acid') && (
                              <div className="text-xs text-amber-300 mt-1">Only Iron supplement covered</div>
                            )}
                          </div>
                          <Button 
                            size="sm" 
                            className="w-full text-white font-semibold bg-gradient-to-r from-violet-500 via-fuchsia-500 to-purple-600 hover:from-violet-600 hover:via-fuchsia-600 hover:to-purple-700 shadow-lg border-2 border-white ring-1 ring-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                            onClick={() => {
                              setRows(prev => prev.map(r => 
                                r.id === c.id 
                                  ? { ...r, status: "Approved" } 
                                  : r
                              ))
                              const eligibleAmount = c.claimType.includes('Prescription Drugs') && c.notes.includes('Folic Acid') ? '₱500' :
                                                     c.claimType.includes('Prescription Drugs') ? '₱0' : '₱65,000'
                              toast.success("Recommendation Accepted", {
                                description: `Claim ${c.id} approved for ${eligibleAmount}`,
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
        ) : openPatientTabs.includes(activeTab) ? (
          <PatientDetailTabs patientId={activeTab} />
        ) : (
          // Fallback to worklist
          <div className="p-6">Tab content not found, returning to worklist.</div>
        )}
      </div>
      {/* Bottom-left Chat/Call popup */}
      <WorklistChatPopup
        open={chatOpen}
        mode={chatMode}
        onClose={() => setChatOpen(false)}
        contextClaimIds={chatContextClaims}
      />
      <LinkDocumentsModal
        open={isLinkDocumentsModalOpen}
        onOpenChange={setIsLinkDocumentsModalOpen}
        claimIds={selectedRows}
        onDocumentsLinked={(claimIds, documentNames) => {
          // Update linked documents for each claim
          setLinkedDocuments(prev => {
            const updated = { ...prev }
            claimIds.forEach(claimId => {
              updated[claimId] = [...(updated[claimId] || []), ...documentNames]
            })
            return updated
          })
        }}
      />
    </div>
  )
}
