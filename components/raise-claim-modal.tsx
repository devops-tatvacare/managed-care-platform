"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, ArrowLeft, Link2, CheckCircle2, XCircle, FileText, CreditCard, Shield, Pill, ClipboardList } from "lucide-react"
import { toast } from "sonner"

// Document data for linking (same as link-documents-modal but filtered for Maria)
const availableDocuments = [
  { id: "doc1", name: "Claim_Form_A.pdf", type: "Medical Report", patientName: "Maria Silva", empiId: "EMPI999901" },
  { id: "doc2", name: "Hospital_Bill_Scan.png", type: "Invoice", patientName: "Maria Silva", empiId: "EMPI999901" },
  { id: "doc4", name: "Lab_Report_X-Ray.png", type: "Lab Report", patientName: "Maria Silva", empiId: "EMPI999901" },
  { id: "doc6", name: "Insurance_Card_Copy.png", type: "Insurance Document", patientName: "Maria Silva", empiId: "EMPI999901" },
  { id: "doc8", name: "Pre_Auth_Letter.pdf", type: "Authorization", patientName: "Maria Silva", empiId: "EMPI999901" },
  { id: "doc11", name: "Dr_Sophie_Consultation_Notes.pdf", type: "Medical Report", patientName: "Maria Silva", empiId: "EMPI999901" },
  { id: "doc12", name: "Prescription_2024_09_02.pdf", type: "Prescription", patientName: "Maria Silva", empiId: "EMPI999901" },
  { id: "doc13", name: "Patient_Consent_Form.pdf", type: "Consent Form", patientName: "Maria Silva", empiId: "EMPI999901" },
  { id: "doc14", name: "Insurance_Policy_Details.pdf", type: "Insurance Document", patientName: "Maria Silva", empiId: "EMPI999901" },
  { id: "doc15", name: "Fee_Receipt_Sept_2024.pdf", type: "Invoice", patientName: "Maria Silva", empiId: "EMPI999901" },
  // IPD-specific documents for Maria's delivery
  { id: "doc16", name: "Discharge_Summary_2025_05_25.pdf", type: "Discharge Summary", patientName: "Maria Silva", empiId: "EMPI999901" },
  { id: "doc17", name: "Birth_Certificate_Baby_Silva.pdf", type: "Birth Certificate", patientName: "Maria Silva", empiId: "EMPI999901" },
  { id: "doc18", name: "Delivery_Room_Notes.pdf", type: "Medical Report", patientName: "Maria Silva", empiId: "EMPI999901" },
  { id: "doc19", name: "Anesthesia_Record.pdf", type: "Medical Report", patientName: "Maria Silva", empiId: "EMPI999901" },
  { id: "doc20", name: "Nursing_Care_Plan.pdf", type: "Medical Report", patientName: "Maria Silva", empiId: "EMPI999901" },
  { id: "doc21", name: "Room_Charges_Bill.pdf", type: "Invoice", patientName: "Maria Silva", empiId: "EMPI999901" },
  { id: "doc22", name: "Pharmacy_Bill_IPD.pdf", type: "Invoice", patientName: "Maria Silva", empiId: "EMPI999901" },
  { id: "doc23", name: "Pre_Natal_Records.pdf", type: "Medical Report", patientName: "Maria Silva", empiId: "EMPI999901" },
  { id: "doc24", name: "Lab_Reports_Delivery.pdf", type: "Lab Report", patientName: "Maria Silva", empiId: "EMPI999901" },
  { id: "doc25", name: "PhilHealth_Case_Rate_Form.pdf", type: "Authorization", patientName: "Maria Silva", empiId: "EMPI999901" },
]

interface HospitalVisit {
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

interface ChecklistItem {
  id: string
  label: string
  icon: any
  required: boolean
  linkedDocuments: string[]
  description: string
}

interface RaiseClaimModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  visitIds: string[]
  visits: HospitalVisit[]
  onClaimSubmitted?: (visitIds: string[]) => void
}

export default function RaiseClaimModal({
  open,
  onOpenChange,
  visitIds,
  visits,
  onClaimSubmitted,
}: RaiseClaimModalProps) {
  const [currentView, setCurrentView] = useState<'checklist' | 'link-docs'>('checklist')
  // Dynamic checklist based on visit type
  const getChecklistItems = (visits: HospitalVisit[]) => {
    const hasIPDVisit = visits.some(v => v.visitType.includes('IPD'))
    
    const baseItems = [
      {
        id: 'doctor-notes',
        label: 'Doctor Notes',
        icon: FileText,
        required: true,
        linkedDocuments: [],
        description: hasIPDVisit ? 'Medical consultation notes, delivery notes, and diagnosis' : 'Medical consultation notes and diagnosis'
      },
      {
        id: 'fees-amount',
        label: 'Fees Amount',
        icon: CreditCard,
        required: true,
        linkedDocuments: [],
        description: hasIPDVisit ? 'Hospital bills, room charges, pharmacy bills, and procedure fees' : 'Treatment and consultation fee receipts'
      },
      {
        id: 'insurance-policy',
        label: 'Insurance Policy',
        icon: Shield,
        required: true,
        linkedDocuments: [],
        description: 'Valid insurance policy documentation and PhilHealth authorization'
      }
    ]

    if (hasIPDVisit) {
      baseItems.push(
        {
          id: 'discharge-summary',
          label: 'Discharge Summary',
          icon: FileText,
          required: true,
          linkedDocuments: [],
          description: 'Complete discharge summary with procedure details and final diagnosis'
        },
        {
          id: 'birth-documents',
          label: 'Birth Documents',
          icon: ClipboardList,
          required: true,
          linkedDocuments: [],
          description: 'Birth certificate and delivery documentation for maternity claims'
        }
      )
    } else {
      baseItems.push(
        {
          id: 'prescription',
          label: 'Prescription',
          icon: Pill,
          required: true,
          linkedDocuments: [],
          description: 'Prescribed medications and treatment plan'
        },
        {
          id: 'consent-form',
          label: 'Consent Form',
          icon: ClipboardList,
          required: true,
          linkedDocuments: [],
          description: 'Patient consent for treatment and claim submission'
        }
      )
    }

    return baseItems
  }

  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])

  // Update checklist when visits change
  useEffect(() => {
    if (visits.length > 0) {
      setChecklistItems(getChecklistItems(visits))
    }
  }, [visits])

  // Document linking states
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [currentChecklistItem, setCurrentChecklistItem] = useState<string>("")

  const uniqueTypes = useMemo(() => {
    const types = [...new Set(availableDocuments.map(doc => doc.type))]
    return types.sort()
  }, [])

  const filteredDocuments = useMemo(() => {
    return availableDocuments.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = typeFilter === "all" || doc.type === typeFilter
      return matchesSearch && matchesType
    })
  }, [searchQuery, typeFilter])

  // Reset states when modal opens
  useEffect(() => {
    if (open) {
      setCurrentView('checklist')
      setSelectedDocs([])
      setSearchQuery("")
      setTypeFilter("all")
      setCurrentChecklistItem("")
    }
  }, [open])

  const handleLinkToChecklist = (checklistItemId: string) => {
    if (selectedDocs.length === 0) {
      toast.warning("No documents selected", {
        description: "Please select at least one document to link.",
      })
      return
    }

    const selectedDocumentNames = availableDocuments
      .filter(doc => selectedDocs.includes(doc.id))
      .map(doc => doc.name)

    // Update the checklist item with linked documents
    setChecklistItems(prev => prev.map(item => 
      item.id === checklistItemId
        ? { ...item, linkedDocuments: [...item.linkedDocuments, ...selectedDocumentNames] }
        : item
    ))

    toast.success("Documents linked successfully", {
      description: `${selectedDocs.length} document(s) linked to ${checklistItems.find(i => i.id === checklistItemId)?.label}`,
    })

    // Go back to checklist view
    setCurrentView('checklist')
    setSelectedDocs([])
    setSearchQuery("")
    setTypeFilter("all")
  }

  const handleDocSelect = (docId: string, checked: boolean) => {
    setSelectedDocs(prev =>
      checked ? [...prev, docId] : prev.filter(id => id !== docId)
    )
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDocs(filteredDocuments.map(doc => doc.id))
    } else {
      setSelectedDocs([])
    }
  }

  const handleRemoveDocument = (checklistItemId: string, docName: string) => {
    setChecklistItems(prev => prev.map(item => 
      item.id === checklistItemId
        ? { ...item, linkedDocuments: item.linkedDocuments.filter(d => d !== docName) }
        : item
    ))
  }

  const handleSubmitClaim = () => {
    const incompleteItems = checklistItems.filter(item => item.required && item.linkedDocuments.length === 0)
    
    if (incompleteItems.length > 0) {
      toast.error("Incomplete checklist", {
        description: `Please link documents for: ${incompleteItems.map(i => i.label).join(', ')}`,
      })
      return
    }

    onClaimSubmitted?.(visitIds)
    toast.success("Claims submitted successfully", {
      description: `${visitIds.length} visit claim(s) submitted to insurer`,
    })
    onOpenChange(false)
  }

  const allRequiredItemsCompleted = checklistItems
    .filter(item => item.required)
    .every(item => item.linkedDocuments.length > 0)

  const resetFilters = () => {
    setSearchQuery("")
    setTypeFilter("all")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="text-[hsl(var(--text-100))]">
            {currentView === 'checklist' ? 'Raise Claim' : 'Link Documents'}
          </DialogTitle>
          {currentView === 'link-docs' && (
            <div className="flex items-center gap-2 text-sm text-[hsl(var(--text-80))] pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView('checklist')}
                className="p-0 h-auto text-[hsl(var(--brand-primary))] hover:text-[hsl(var(--brand-primary))] hover:bg-transparent"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Checklist
              </Button>
              <span>•</span>
              <span>Linking documents for {checklistItems.find(i => i.id === currentChecklistItem)?.label}</span>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-0 px-1">
          {currentView === 'checklist' ? (
            <div className="space-y-4 pr-2">
              {/* Visit Summary */}
              <div className="p-3 bg-[hsl(var(--bg-10))] rounded-lg border border-[hsl(var(--stroke-grey))] flex-shrink-0">
                <div className="text-sm font-medium text-[hsl(var(--text-100))] mb-1">
                  Submitting claims for {visitIds.length} visit{visitIds.length > 1 ? 's' : ''}
                </div>
                <div className="text-xs text-[hsl(var(--text-80))]">
                  {visits.map(v => `${v.visitId} (${v.visitDate})`).join(', ')}
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-shrink-0">
                  <h4 className="text-sm font-medium text-[hsl(var(--text-100))]">Pre-submission Checklist</h4>
                  <div className="text-xs text-[hsl(var(--text-80))]">
                    {checklistItems.filter(i => i.required && i.linkedDocuments.length > 0).length} of {checklistItems.filter(i => i.required).length} required items completed
                  </div>
                </div>

                {checklistItems.map(item => {
                  const Icon = item.icon
                  const isCompleted = item.linkedDocuments.length > 0
                  const isRequired = item.required

                  return (
                    <div key={item.id} className="border border-[hsl(var(--stroke-grey))] rounded-lg p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-[hsl(var(--bg-10))] text-[hsl(var(--text-80))]'}`}>
                            {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-medium text-[hsl(var(--text-100))] text-sm">{item.label}</h5>
                              {isRequired && (
                                <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full flex-shrink-0">Required</span>
                              )}
                            </div>
                            <p className="text-xs text-[hsl(var(--text-80))] mb-2">{item.description}</p>
                            
                            {/* Linked Documents */}
                            {item.linkedDocuments.length > 0 && (
                              <div className="space-y-1.5">
                                <div className="text-xs font-medium text-[hsl(var(--text-80))]">
                                  Linked Documents ({item.linkedDocuments.length})
                                </div>
                                <div className="space-y-1">
                                  {item.linkedDocuments.map((doc, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-green-50 border border-green-200 rounded p-2">
                                      <span className="text-xs text-green-800 truncate flex-1 mr-2">{doc}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveDocument(item.id, doc)}
                                        className="h-5 w-5 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 flex-shrink-0"
                                      >
                                        <XCircle className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentChecklistItem(item.id)
                            setCurrentView('link-docs')
                          }}
                          className="text-[hsl(var(--brand-primary))] border-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))] hover:text-white text-xs px-2 py-1 h-7 flex-shrink-0"
                        >
                          <Link2 className="w-3 h-3 mr-1" />
                          Link
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Document Linking View */
            <div className="space-y-3 pr-2 flex flex-col min-h-0">
              {/* Search and Filter Controls */}
              <div className="space-y-3 p-3 bg-[hsl(var(--bg-10))] rounded-lg border border-[hsl(var(--stroke-grey))] flex-shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {/* General Search */}
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[hsl(var(--text-80))] w-3 h-3" />
                    <Input
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-7 h-8 text-sm border-[hsl(var(--stroke-grey))] focus:border-[hsl(var(--brand-primary))] focus:ring-[hsl(var(--brand-primary))]"
                    />
                  </div>

                  {/* Document Type Filter */}
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-8 text-sm border-[hsl(var(--stroke-grey))] focus:border-[hsl(var(--brand-primary))] focus:ring-[hsl(var(--brand-primary))]">
                      <SelectValue placeholder="Filter by document type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Document Types</SelectItem>
                      {uniqueTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-[hsl(var(--text-80))]">
                    Showing {filteredDocuments.length} of {availableDocuments.length} documents
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={resetFilters}
                    className="text-xs h-6 px-2 text-[hsl(var(--text-80))] border-[hsl(var(--stroke-grey))] hover:bg-[hsl(var(--bg-10))]"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>

              {/* Document List with proper scrolling */}
              <div className="flex-1 overflow-hidden flex flex-col min-h-0 border border-[hsl(var(--stroke-grey))] rounded-lg">
                {/* Select All Header - Fixed */}
                <div className="flex items-center justify-between p-3 border-b border-[hsl(var(--stroke-grey))] bg-white flex-shrink-0">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all-docs"
                      onCheckedChange={handleSelectAll}
                      checked={filteredDocuments.length > 0 && selectedDocs.length === filteredDocuments.length}
                    />
                    <label htmlFor="select-all-docs" className="text-sm font-medium text-[hsl(var(--text-100))]">
                      Select All ({filteredDocuments.length})
                    </label>
                  </div>
                  <div className="text-xs text-[hsl(var(--text-80))]">
                    {selectedDocs.length} selected
                  </div>
                </div>

                {/* Document Items - Scrollable */}
                <div className="flex-1 overflow-auto p-3">
                  {filteredDocuments.length === 0 ? (
                    <div className="text-center py-8 text-[hsl(var(--text-80))]">
                      No documents match your search criteria.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredDocuments.map(doc => (
                        <div key={doc.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-[hsl(var(--bg-10))] border border-transparent hover:border-[hsl(var(--stroke-grey))] transition-colors">
                          <Checkbox
                            id={doc.id}
                            onCheckedChange={checked => handleDocSelect(doc.id, !!checked)}
                            checked={selectedDocs.includes(doc.id)}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <label
                              htmlFor={doc.id}
                              className="block text-sm font-medium text-[hsl(var(--text-100))] cursor-pointer hover:text-[hsl(var(--brand-primary))] transition-colors"
                            >
                              {doc.name}
                            </label>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-[hsl(var(--brand-primary))] text-white">
                                {doc.type}
                              </span>
                              <span className="text-xs text-[hsl(var(--text-80))]">
                                {doc.patientName}
                              </span>
                              <span className="text-xs text-[hsl(var(--text-80))]">
                                {doc.empiId}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 mt-4 border-t border-[hsl(var(--stroke-grey))]">
          {currentView === 'checklist' ? (
            <>
              <DialogClose asChild>
                <Button 
                  variant="outline"
                  size="sm"
                  className="border-[hsl(var(--stroke-grey))] text-[hsl(var(--text-80))] hover:bg-[hsl(var(--bg-10))]"
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button 
                onClick={handleSubmitClaim}
                disabled={!allRequiredItemsCompleted}
                size="sm"
                className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white disabled:opacity-50"
              >
                Submit Claim{visitIds.length > 1 ? 's' : ''}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setCurrentView('checklist')}
                size="sm"
                className="border-[hsl(var(--stroke-grey))] text-[hsl(var(--text-80))] hover:bg-[hsl(var(--bg-10))]"
              >
                Back to Checklist
              </Button>
              <Button 
                onClick={() => handleLinkToChecklist(currentChecklistItem)}
                disabled={selectedDocs.length === 0}
                size="sm"
                className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white disabled:opacity-50"
              >
                Link {selectedDocs.length > 0 ? `${selectedDocs.length} ` : ''}Document{selectedDocs.length !== 1 ? 's' : ''}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}