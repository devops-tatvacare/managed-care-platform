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
import { Search } from "lucide-react"
import { toast } from "sonner"

const dummyDocuments = [
  { id: "doc1", name: "Claim_Form_A.pdf", type: "Medical Report", patientName: "Maria Silva", empiId: "EMPI999901" },
  { id: "doc2", name: "Hospital_Bill_Scan.png", type: "Invoice", patientName: "Maria Silva", empiId: "EMPI999901" },
  { id: "doc3", name: "Prescription_Details.pdf", type: "Prescription", patientName: "John Doe", empiId: "EMPI999902" },
  { id: "doc4", name: "Lab_Report_X-Ray.png", type: "Lab Report", patientName: "Maria Silva", empiId: "EMPI999901" },
  { id: "doc5", name: "Discharge_Summary.pdf", type: "Medical Report", patientName: "Jane Smith", empiId: "EMPI999903" },
  { id: "doc6", name: "Insurance_Card_Copy.png", type: "Insurance Document", patientName: "Maria Silva", empiId: "EMPI999901" },
  { id: "doc7", name: "Doctor_Consultation_Notes.pdf", type: "Medical Report", patientName: "Robert Johnson", empiId: "EMPI999904" },
  { id: "doc8", name: "Pre_Auth_Letter.pdf", type: "Authorization", patientName: "Maria Silva", empiId: "EMPI999901" },
  { id: "doc9", name: "Blood_Test_Results.pdf", type: "Lab Report", patientName: "John Doe", empiId: "EMPI999902" },
  { id: "doc10", name: "Surgery_Report.pdf", type: "Medical Report", patientName: "Jane Smith", empiId: "EMPI999903" },
]

interface LinkDocumentsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  claimIds: string[]
  onDocumentsLinked?: (claimIds: string[], documentNames: string[]) => void
}

export default function LinkDocumentsModal({
  open,
  onOpenChange,
  claimIds,
  onDocumentsLinked,
}: LinkDocumentsModalProps) {
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [empiFilter, setEmpiFilter] = useState("")
  const [patientFilter, setPatientFilter] = useState("")

  const uniqueTypes = useMemo(() => {
    const types = [...new Set(dummyDocuments.map(doc => doc.type))]
    return types.sort()
  }, [])

  const filteredDocuments = useMemo(() => {
    return dummyDocuments.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = typeFilter === "all" || doc.type === typeFilter
      const matchesEmpi = doc.empiId.toLowerCase().includes(empiFilter.toLowerCase())
      const matchesPatient = doc.patientName.toLowerCase().includes(patientFilter.toLowerCase())
      
      return matchesSearch && matchesType && matchesEmpi && matchesPatient
    })
  }, [searchQuery, typeFilter, empiFilter, patientFilter])

  const handleLinkDocuments = () => {
    if (selectedDocs.length === 0) {
      toast.warning("No documents selected", {
        description: "Please select at least one document to link.",
      })
      return
    }
    
    // Get the names of the selected documents
    const selectedDocumentNames = dummyDocuments
      .filter(doc => selectedDocs.includes(doc.id))
      .map(doc => doc.name)
    
    // Call the callback with claimIds and document names
    onDocumentsLinked?.(claimIds, selectedDocumentNames)
    
    toast.success("Documents linked successfully", {
      description: `${selectedDocs.length} document(s) linked to claim(s): ${claimIds.join(", ")}`,
    })
    onOpenChange(false)
    setSelectedDocs([])
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

  const resetFilters = () => {
    setSearchQuery("")
    setTypeFilter("all")
    setEmpiFilter("")
    setPatientFilter("")
  }

  // Reset selections when modal opens
  useEffect(() => {
    if (open) {
      setSelectedDocs([])
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--text-100))]">Link Documents to Claim(s)</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-[hsl(var(--text-80))]">
            Select documents to link to the following claim(s):{" "}
            <span className="font-semibold text-[hsl(var(--brand-primary))]">{claimIds.join(", ")}</span>
          </p>

          {/* Search and Filter Controls */}
          <div className="space-y-3 p-4 bg-[hsl(var(--bg-10))] rounded-lg border border-[hsl(var(--stroke-grey))]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* General Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--text-80))] w-4 h-4" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 border-[hsl(var(--stroke-grey))] focus:border-[hsl(var(--brand-primary))] focus:ring-[hsl(var(--brand-primary))]"
                />
              </div>

              {/* Document Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="border-[hsl(var(--stroke-grey))] focus:border-[hsl(var(--brand-primary))] focus:ring-[hsl(var(--brand-primary))]">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Patient Name Filter */}
              <Input
                placeholder="Filter by patient name..."
                value={patientFilter}
                onChange={(e) => setPatientFilter(e.target.value)}
                className="border-[hsl(var(--stroke-grey))] focus:border-[hsl(var(--brand-primary))] focus:ring-[hsl(var(--brand-primary))]"
              />

              {/* EMPI ID Filter */}
              <Input
                placeholder="Filter by EMPI ID..."
                value={empiFilter}
                onChange={(e) => setEmpiFilter(e.target.value)}
                className="border-[hsl(var(--stroke-grey))] focus:border-[hsl(var(--brand-primary))] focus:ring-[hsl(var(--brand-primary))]"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-[hsl(var(--text-80))]">
                Showing {filteredDocuments.length} of {dummyDocuments.length} documents
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetFilters}
                className="text-[hsl(var(--text-80))] border-[hsl(var(--stroke-grey))] hover:bg-[hsl(var(--bg-10))]"
              >
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Document List */}
          <ScrollArea className="h-80 w-full rounded-md border border-[hsl(var(--stroke-grey))]">
            <div className="p-4">
              {/* Select All Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[hsl(var(--stroke-grey))]">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    onCheckedChange={handleSelectAll}
                    checked={filteredDocuments.length > 0 && selectedDocs.length === filteredDocuments.length}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium text-[hsl(var(--text-100))]">
                    Select All ({filteredDocuments.length})
                  </label>
                </div>
                <div className="text-xs text-[hsl(var(--text-80))]">
                  {selectedDocs.length} selected
                </div>
              </div>

              {/* Document Items */}
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-8 text-[hsl(var(--text-80))]">
                  No documents match your search criteria.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDocuments.map(doc => (
                    <div key={doc.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-[hsl(var(--bg-10))] border border-transparent hover:border-[hsl(var(--stroke-grey))] transition-colors">
                      <Checkbox
                        id={doc.id}
                        onCheckedChange={checked => handleDocSelect(doc.id, !!checked)}
                        checked={selectedDocs.includes(doc.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={doc.id}
                          className="block text-sm font-medium text-[hsl(var(--text-100))] cursor-pointer hover:text-[hsl(var(--brand-primary))] transition-colors"
                        >
                          {doc.name}
                        </label>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-[hsl(var(--brand-primary))] text-white">
                            {doc.type}
                          </span>
                          <span className="text-xs text-[hsl(var(--text-80))]">
                            Patient: {doc.patientName}
                          </span>
                          <span className="text-xs text-[hsl(var(--text-80))]">
                            EMPI: {doc.empiId}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button 
              variant="outline"
              className="border-[hsl(var(--stroke-grey))] text-[hsl(var(--text-80))] hover:bg-[hsl(var(--bg-10))]"
            >
              Cancel
            </Button>
          </DialogClose>
          <Button 
            onClick={handleLinkDocuments}
            disabled={selectedDocs.length === 0}
            className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))] text-white disabled:opacity-50"
          >
            Link {selectedDocs.length > 0 ? `${selectedDocs.length} ` : ''}Documents
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}