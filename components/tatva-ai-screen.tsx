"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageSquare, Plus, Sparkles, User, Activity, Users, BarChart3, Heart, Brain } from "lucide-react"
import ChatComposer from "@/components/ui/chat-composer"
import { useVoiceRecording } from "@/hooks/use-voice-recording"
import { generatePatientsData, Patient } from "@/lib/generate-patients-data"
import { generatePatientDetailsData } from "@/lib/generate-patient-details-data"
import { motion, AnimatePresence } from "framer-motion"

interface Message {
  id: string
  content: string | React.ReactNode
  sender: "user" | "ai"
  timestamp: Date
  type?: "text" | "patient-overview" | "patient-deep-dive" | "analytics"
}

interface ChatHistory {
  id: string
  title: string
  lastMessage: string
  timestamp: Date
  messages: Message[]
  chatType: "patient-overview" | "patient-deep-dive" | "general"
  patientEmpiId?: string
}

// Generate patient data for context
const allPatients = generatePatientsData(100)

// Helper functions for patient-centric chat content
function generatePatientPoolOverview() {
  const totalPatients = allPatients.length
  const activePatients = allPatients.filter(p => p.status === "Active").length
  const programs = allPatients.reduce((acc, p) => {
    acc[p.programName] = (acc[p.programName] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const topPrograms = Object.entries(programs)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
  
  const avgAge = Math.round(allPatients.reduce((sum, p) => {
    const age = new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear()
    return sum + age
  }, 0) / allPatients.length)
  
  const genderDistribution = allPatients.reduce((acc, p) => {
    acc[p.gender] = (acc[p.gender] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return (
    <div className="space-y-3 max-w-none">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-blue-600" />
          <h3 className="text-base font-semibold text-gray-800">Patient Pool Overview</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{totalPatients}</div>
            <div className="text-xs text-gray-600">Total Patients</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{activePatients}</div>
            <div className="text-xs text-gray-600">Active</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-600">{avgAge}</div>
            <div className="text-xs text-gray-600">Avg Age</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-indigo-600">{Object.keys(programs).length}</div>
            <div className="text-xs text-gray-600">Programs</div>
          </div>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-green-600" />
            <h4 className="text-sm font-semibold text-gray-800">Top Health Programs</h4>
          </div>
          <div className="space-y-1">
            {topPrograms.map(([program, count]) => (
              <div key={program} className="flex justify-between items-center">
                <span className="text-xs text-gray-700">{program}</span>
                <span className="text-xs font-medium text-gray-900">{count} patients</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-pink-600" />
            <h4 className="text-sm font-semibold text-gray-800">Demographics</h4>
          </div>
          <div className="space-y-1">
            {Object.entries(genderDistribution).map(([gender, count]) => (
              <div key={gender} className="flex justify-between items-center">
                <span className="text-xs text-gray-700">{gender}</span>
                <span className="text-xs font-medium text-gray-900">{count} patients</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function generatePatientDeepDive(empiId: string) {
  const patient = allPatients.find(p => p.empiId === empiId)
  if (!patient) return <div>Patient not found</div>
  
  const details = generatePatientDetailsData(empiId, patient)
  const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()
  
  return (
    <div className="space-y-4 max-w-none">
      <div className="bg-[hsl(var(--bg-10))] border border-[hsl(var(--stroke-grey))] rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-[hsl(var(--brand-primary))] rounded-lg">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-[hsl(var(--text-100))]">Patient Deep Dive</h3>
            <p className="text-sm text-[hsl(var(--text-80))]">{patient.name} • {empiId}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white border border-[hsl(var(--stroke-grey))] rounded-lg p-3">
            <div className="text-xs font-medium text-[hsl(var(--text-80))] mb-2">Patient Profile</div>
            <div className="space-y-1">
              <div className="text-sm text-[hsl(var(--text-100))]"><span className="font-medium">Age:</span> {age} years</div>
              <div className="text-sm text-[hsl(var(--text-100))]"><span className="font-medium">Gender:</span> {patient.gender}</div>
              <div className="text-sm text-[hsl(var(--text-100))]"><span className="font-medium">Program:</span> {patient.programName}</div>
            </div>
          </div>
          
          <div className="bg-white border border-[hsl(var(--stroke-grey))] rounded-lg p-3">
            <div className="text-xs font-medium text-[hsl(var(--text-80))] mb-2">Healthcare Journey</div>
            <div className="space-y-1">
              <div className="text-sm text-[hsl(var(--text-100))]"><span className="font-medium">Primary Doctor:</span> {patient.doctorName.split(',')[0]}</div>
              <div className="text-sm text-[hsl(var(--text-100))]"><span className="font-medium">Consultations:</span> {details.consultationHistory.length}</div>
              <div className="text-sm text-[hsl(var(--text-100))]"><span className="font-medium">Status:</span> <span className={patient.status === 'Active' ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--warning))]'}>{patient.status}</span></div>
            </div>
          </div>
          
          <div className="bg-white border border-[hsl(var(--stroke-grey))] rounded-lg p-3">
            <div className="text-xs font-medium text-[hsl(var(--text-80))] mb-2">Health Metrics</div>
            <div className="space-y-1">
              <div className="text-sm text-[hsl(var(--text-100))]"><span className="font-medium">Active Medications:</span> <span className="text-[hsl(var(--brand-primary))] font-semibold">{details.medications.filter(m => m.status === 'Active').length}</span></div>
              <div className="text-sm text-[hsl(var(--text-100))]"><span className="font-medium">Recent Labs:</span> <span className="text-[hsl(var(--brand-primary))] font-semibold">{details.labReports.slice(0, 3).length}</span></div>
              <div className="text-sm text-[hsl(var(--text-100))]"><span className="font-medium">Claims:</span> <span className="text-[hsl(var(--brand-primary))] font-semibold">{details.claims.length}</span></div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-[hsl(var(--stroke-grey))] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-[hsl(var(--success))]/10 rounded-lg">
              <Heart className="w-4 h-4 text-[hsl(var(--success))]" />
            </div>
            <h4 className="text-base font-medium text-[hsl(var(--text-100))]">Recent Health Markers</h4>
          </div>
          <div className="space-y-3">
            {details.healthMarkers.slice(0, 4).map((marker) => (
              <div key={marker.healthMarker} className="bg-[hsl(var(--bg-10))] rounded-lg p-3">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium text-[hsl(var(--text-100))]">{marker.healthMarker}</span>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    marker.trend === 'increasing' ? 'bg-green-100 text-green-700' : 
                    marker.trend === 'stable' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {marker.trend}
                  </div>
                </div>
                <div className="text-lg font-semibold text-[hsl(var(--brand-primary))]">{marker.latestValue} {marker.units}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white border border-[hsl(var(--stroke-grey))] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-[hsl(var(--info))]/10 rounded-lg">
              <Activity className="w-4 h-4 text-[hsl(var(--info))]" />
            </div>
            <h4 className="text-base font-medium text-[hsl(var(--text-100))]">Predictive Insights</h4>
          </div>
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-[hsl(var(--info))]/5 to-[hsl(var(--brand-primary))]/5 border border-[hsl(var(--info))]/20 rounded-lg p-3">
              <div className="text-sm font-semibold text-[hsl(var(--info))] mb-1">Next Stage Prediction</div>
              <div className="text-sm text-[hsl(var(--text-80))]">Based on current trends and treatment compliance</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-[hsl(var(--warning))] rounded-full mt-2 flex-shrink-0"></div>
                <div className="text-sm text-[hsl(var(--text-100))]"><span className="font-medium">Risk Level:</span> <span className="text-[hsl(var(--warning))]">Medium</span> - requires continued monitoring</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-[hsl(var(--info))] rounded-full mt-2 flex-shrink-0"></div>
                <div className="text-sm text-[hsl(var(--text-100))]"><span className="font-medium">Recommended Action:</span> Schedule quarterly HbA1c screening</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-[hsl(var(--success))] rounded-full mt-2 flex-shrink-0"></div>
                <div className="text-sm text-[hsl(var(--text-100))]"><span className="font-medium">Compliance Score:</span> <span className="text-[hsl(var(--success))]">85%</span> - Good medication adherence</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-[hsl(var(--brand-primary))] rounded-full mt-2 flex-shrink-0"></div>
                <div className="text-sm text-[hsl(var(--text-100))]"><span className="font-medium">Next Milestone:</span> Target HbA1c <span className="text-[hsl(var(--brand-primary))]">&lt;7%</span> within 6 months</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Mock chat history data with patient-centric focus
const mockChatHistory: ChatHistory[] = [
  {
    id: "1",
    title: "Patient Pool Overview - Disease Distribution",
    lastMessage: "Comprehensive patient pool analytics with disease trends",
    timestamp: new Date(2024, 0, 10, 14, 30),
    chatType: "patient-overview",
    messages: [
      {
        id: "1",
        content: "Show me the current patient pool overview and disease distribution across our network",
        sender: "user",
        timestamp: new Date(2024, 0, 10, 14, 25),
        type: "text"
      },
      {
        id: "2",
        content: generatePatientPoolOverview(),
        sender: "ai",
        timestamp: new Date(2024, 0, 10, 14, 26),
        type: "patient-overview"
      }
    ]
  },
  {
    id: "2",
    title: "Patient Deep Dive - EMPI1000001 (Ravi Kumar)",
    lastMessage: "Comprehensive patient analysis with predictive insights",
    timestamp: new Date(2024, 0, 9, 16, 45),
    chatType: "patient-deep-dive",
    patientEmpiId: "EMPI1000001",
    messages: [
      {
        id: "1",
        content: "Provide a complete analysis for patient EMPI1000001 including current health status and predictive insights",
        sender: "user",
        timestamp: new Date(2024, 0, 9, 16, 40),
        type: "text"
      },
      {
        id: "2",
        content: generatePatientDeepDive("EMPI1000001"),
        sender: "ai",
        timestamp: new Date(2024, 0, 9, 16, 42),
        type: "patient-deep-dive"
      }
    ]
  },
  {
    id: "3",
    title: "Patient Deep Dive - EMPI1000002 (Priya Sharma)",
    lastMessage: "Detailed patient analysis with treatment recommendations",
    timestamp: new Date(2024, 0, 8, 11, 20),
    chatType: "patient-deep-dive",
    patientEmpiId: "EMPI1000002",
    messages: [
      {
        id: "1",
        content: "Analyze patient EMPI1000002 - focus on treatment adherence and risk factors",
        sender: "user",
        timestamp: new Date(2024, 0, 8, 11, 15),
        type: "text"
      },
      {
        id: "2",
        content: generatePatientDeepDive("EMPI1000002"),
        sender: "ai",
        timestamp: new Date(2024, 0, 8, 11, 17),
        type: "patient-deep-dive"
      }
    ]
  },
  {
    id: "4",
    title: "Patient Deep Dive - EMPI1000003 (Anjali Verma)",
    lastMessage: "Advanced analytics with personalized treatment pathway",
    timestamp: new Date(2024, 0, 7, 9, 30),
    chatType: "patient-deep-dive",
    patientEmpiId: "EMPI1000003",
    messages: [
      {
        id: "1",
        content: "Generate comprehensive patient profile for EMPI1000003 with future care planning",
        sender: "user",
        timestamp: new Date(2024, 0, 7, 9, 25),
        type: "text"
      },
      {
        id: "2",
        content: generatePatientDeepDive("EMPI1000003"),
        sender: "ai",
        timestamp: new Date(2024, 0, 7, 9, 27),
        type: "patient-deep-dive"
      }
    ]
  },
  {
    id: "5",
    title: "Patient Deep Dive - EMPI1000004 (Michael Thompson)",
    lastMessage: "Multi-condition patient analysis with coordinated care plan",
    timestamp: new Date(2024, 0, 6, 15, 10),
    chatType: "patient-deep-dive",
    patientEmpiId: "EMPI1000004",
    messages: [
      {
        id: "1",
        content: "Analyze patient EMPI1000004 with focus on multi-condition management and care coordination",
        sender: "user",
        timestamp: new Date(2024, 0, 6, 15, 5),
        type: "text"
      },
      {
        id: "2",
        content: generatePatientDeepDive("EMPI1000004"),
        sender: "ai",
        timestamp: new Date(2024, 0, 6, 15, 7),
        type: "patient-deep-dive"
      }
    ]
  }
]

interface TatvaAIScreenProps {
  initialPatientEmpiId?: string | null
}

export default function TatvaAIScreen({ initialPatientEmpiId }: TatvaAIScreenProps = {}) {
  const [chatHistory] = useState<ChatHistory[]>(mockChatHistory)
  const [activeChat, setActiveChat] = useState<string | null>(chatHistory[0]?.id || null)
  const [newMessage, setNewMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>(chatHistory[0]?.messages || [])
  const [hasInitializedPatientChat, setHasInitializedPatientChat] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Voice recording functionality
  const [voiceState, voiceActions] = useVoiceRecording({
    onTranscriptionComplete: (transcript) => {
      setNewMessage(transcript)
    }
  })

  // Handle initial patient EMPI ID to create patient-specific chat
  useEffect(() => {
    if (initialPatientEmpiId && !hasInitializedPatientChat) {
      // Create a new chat with patient context
      const patient = allPatients.find(p => p.empiId === initialPatientEmpiId)
      if (patient) {
        // Set up new patient chat - start with empty state like "New Chat"
        setActiveChat("patient-context")
        setMessages([])
        setHasInitializedPatientChat(true)
        
        // Simulate the message sending flow
        setTimeout(() => {
          // Step 1: Add user message
          const userMessage: Message = {
            id: "patient-context-user",
            content: `Please provide a comprehensive analysis for patient ${patient.name} (${initialPatientEmpiId})`,
            sender: "user",
            timestamp: new Date(),
            type: "text"
          }
          
          setMessages([userMessage])
          
          // Auto-scroll after user message
          setTimeout(() => scrollToBottom(), 100)
          
          // Step 2: Add typing indicator after brief delay
          setTimeout(() => {
            const typingMessage: Message = {
              id: "patient-context-typing",
              content: "typing",
              sender: "ai",
              timestamp: new Date(),
              type: "text"
            }
            
            setMessages([userMessage, typingMessage])
            
            // Auto-scroll after typing indicator
            setTimeout(() => scrollToBottom(), 100)
            
            // Step 3: Replace typing with actual AI response after delay
            setTimeout(() => {
              const aiMessage: Message = {
                id: "patient-context-ai",
                content: generatePatientDeepDive(initialPatientEmpiId),
                sender: "ai",
                timestamp: new Date(),
                type: "patient-deep-dive"
              }
              
              setMessages([userMessage, aiMessage])
              
              // Auto-scroll after AI response
              setTimeout(() => scrollToBottom(), 100)
            }, 1500) // 1.5 second typing simulation
            
          }, 500) // 500ms delay before typing indicator
          
        }, 300) // 300ms delay before sending user message
      }
    }
  }, [initialPatientEmpiId, hasInitializedPatientChat])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleChatSelect = (chatId: string) => {
    setActiveChat(chatId)
    const selectedChat = chatHistory.find(chat => chat.id === chatId)
    setMessages(selectedChat?.messages || [])
  }

  const handleNewChat = () => {
    setActiveChat("new")
    setMessages([])
  }

  const handleSendMessage = () => {
    if (!newMessage.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: newMessage,
      sender: "user",
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setNewMessage("")

    // Generate patient-centric AI response based on message content
    setTimeout(() => {
      let aiContent: string | React.ReactNode = "I'm here to provide patient-centric healthcare analytics and insights. How can I help you today?"
      let messageType: "text" | "patient-overview" | "patient-deep-dive" = "text"
      
      if (newMessage.toLowerCase().includes('patient pool') || newMessage.toLowerCase().includes('overview')) {
        aiContent = generatePatientPoolOverview()
        messageType = "patient-overview"
      } else if (newMessage.toLowerCase().includes('empi') || newMessage.toLowerCase().includes('deep dive')) {
        const empiMatch = newMessage.match(/EMPI\d{7}/)
        const empiId = empiMatch ? empiMatch[0] : 'EMPI1000001'
        aiContent = generatePatientDeepDive(empiId)
        messageType = "patient-deep-dive"
      } else if (newMessage.toLowerCase().includes('patient') && newMessage.toLowerCase().includes('analys')) {
        aiContent = generatePatientDeepDive('EMPI1000001')
        messageType = "patient-deep-dive"
      }
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiContent,
        sender: "ai",
        timestamp: new Date(),
        type: messageType
      }
      setMessages(prev => [...prev, aiMessage])
    }, 1500)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date: Date) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  return (
    <div className="flex h-full bg-[hsl(var(--bg-100))]">
      {/* Left Panel - Chat History - Tighter */}
      <div className="w-72 bg-card border-r border-[hsl(var(--stroke-grey))] flex flex-col flex-shrink-0">
        {/* Header - Reduced padding */}
        <div className="p-4 border-b border-[hsl(var(--stroke-grey))]">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[hsl(var(--brand-primary))] via-purple-500 to-pink-500 rounded-lg opacity-75 group-hover:opacity-100 blur-sm transition-opacity animate-gradient-x"></div>
            <Button
              onClick={handleNewChat}
              className="relative w-full justify-start gap-2 h-9 bg-card border border-[hsl(var(--stroke-grey))] text-[hsl(var(--text-100))] hover:bg-[hsl(var(--bg-10))] group-hover:border-transparent text-sm"
              variant="outline"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </Button>
          </div>
        </div>

        {/* Chat History - Tighter spacing */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-1">
            {chatHistory.map((chat) => (
              <button
                key={chat.id}
                onClick={() => handleChatSelect(chat.id)}
                className={`w-full p-3 rounded-lg text-left transition-all duration-200 group ${
                  activeChat === chat.id 
                    ? "bg-[hsl(var(--brand-primary)/0.1)] border border-[hsl(var(--brand-primary)/0.3)] shadow-sm" 
                    : "hover:bg-[hsl(var(--bg-10))] border border-transparent hover:shadow-sm"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className={`p-1.5 rounded transition-colors ${
                    activeChat === chat.id 
                      ? "bg-[hsl(var(--brand-primary)/0.2)]" 
                      : "bg-[hsl(var(--bg-10))] group-hover:bg-[hsl(var(--brand-primary)/0.1)]"
                  }`}>
                    {chat.chatType === 'patient-overview' ? (
                      <Users className={`w-3 h-3 transition-colors ${
                        activeChat === chat.id 
                          ? "text-[hsl(var(--brand-primary))]" 
                          : "text-[hsl(var(--text-80))] group-hover:text-[hsl(var(--brand-primary))]"
                      }`} />
                    ) : chat.chatType === 'patient-deep-dive' ? (
                      <Brain className={`w-3 h-3 transition-colors ${
                        activeChat === chat.id 
                          ? "text-[hsl(var(--brand-primary))]" 
                          : "text-[hsl(var(--text-80))] group-hover:text-[hsl(var(--brand-primary))]"
                      }`} />
                    ) : (
                      <MessageSquare className={`w-3 h-3 transition-colors ${
                        activeChat === chat.id 
                          ? "text-[hsl(var(--brand-primary))]" 
                          : "text-[hsl(var(--text-80))] group-hover:text-[hsl(var(--brand-primary))]"
                      }`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs text-[hsl(var(--text-100))] truncate mb-1">
                      {chat.title}
                    </p>
                    <p className="text-xs text-[hsl(var(--text-80))] truncate leading-tight">
                      {chat.lastMessage}
                    </p>
                    <p className="text-xs text-[hsl(var(--text-80))] mt-1 font-medium">
                      {formatDate(chat.timestamp)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Active Chat */}
      <div className="flex-1 flex flex-col relative">
        {/* Background Image at Top */}
        <div 
          className="absolute top-16 left-0 right-0 h-80 pointer-events-none z-0"
          style={{
            backgroundImage: 'url(/primary_background.svg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            backgroundRepeat: 'no-repeat'
          }}
        />
        {activeChat ? (
          <>
            {/* Chat Header - Reduced padding */}
            <div className="bg-card/95 backdrop-blur-sm border-b border-[hsl(var(--stroke-grey))] p-4 flex items-center gap-3 relative z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--brand-primary))] to-purple-600 rounded-full opacity-20 blur-sm"></div>
                <Avatar className="relative w-8 h-8">
                  <AvatarFallback className="bg-gradient-to-r from-[hsl(var(--brand-primary))] to-purple-600 text-white">
                    <Sparkles className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-[hsl(var(--text-100))]">
                  Tatva AI - {chatHistory.find(c => c.id === activeChat)?.title || "New Chat"}
                </h3>
              </div>
            </div>

            {/* Messages - Reduced padding */}
            <div className="flex-1 overflow-y-auto px-4 py-3 relative z-10">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--brand-primary))] via-purple-500 to-pink-500 rounded-full opacity-20 blur-xl"></div>
                      <div className="relative bg-gradient-to-r from-[hsl(var(--brand-primary))] to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                        <Sparkles className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-[hsl(var(--text-100))] mb-3">Welcome to Tatva AI</h3>
                    <p className="text-[hsl(var(--text-80))] leading-relaxed">
                      Your intelligent patient-centric healthcare assistant. Ask me about patient pool analytics, individual patient deep dives, or predictive insights.
                    </p>
                    <div className="mt-6 p-4 bg-[hsl(var(--bg-10))] rounded-xl border border-[hsl(var(--stroke-grey))]">
                      <p className="text-sm text-[hsl(var(--text-80))]">💡 Try asking: "Show patient pool overview" or "Analyze patient EMPI1000001"</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className={`flex gap-3 ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                      {message.sender === "ai" ? (
                        // AI messages - free-flowing, no bubble containers
                        <div className="w-full">
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar className="w-6 h-6 flex-shrink-0">
                              <AvatarFallback className="bg-gradient-to-r from-[hsl(var(--brand-primary))] to-purple-600 text-white">
                                <Sparkles className="w-3 h-3" />
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium text-[hsl(var(--text-80))]">
                              Tatva AI • {formatTime(message.timestamp)}
                            </span>
                          </div>
                          <div className="ml-8 text-sm text-[hsl(var(--text-100))] leading-relaxed">
                            {typeof message.content === 'string' && message.content === 'typing' ? (
                              <div className="flex items-center gap-2 py-2">
                                <div className="flex space-x-1">
                                  <div className="w-2 h-2 bg-[hsl(var(--brand-primary))] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                  <div className="w-2 h-2 bg-[hsl(var(--brand-primary))] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                  <div className="w-2 h-2 bg-[hsl(var(--brand-primary))] rounded-full animate-bounce"></div>
                                </div>
                                <span className="text-xs text-[hsl(var(--text-80))]">Tatva AI is generating response...</span>
                              </div>
                            ) : typeof message.content === 'string' ? (
                              <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ 
                                __html: message.content
                                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                  .replace(/^- (.*?)$/gm, '• $1')
                                  .replace(/^\d+\. (.*?)$/gm, '<strong>$1</strong>')
                              }} />
                            ) : (
                              message.content
                            )}
                          </div>
                        </div>
                      ) : (
                        // User messages - keep in bubble containers (right-aligned)
                        <>
                          <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-2xl bg-[hsl(var(--brand-primary))] text-white shadow-sm">
                            <p className="text-sm leading-relaxed">{message.content}</p>
                            <p className="text-xs mt-1 text-white/70">
                              {formatTime(message.timestamp)}
                            </p>
                          </div>
                          <Avatar className="w-7 h-7 flex-shrink-0">
                            <AvatarFallback className="bg-[hsl(var(--bg-10))] border border-[hsl(var(--stroke-grey))] text-[hsl(var(--text-100))]">
                              <User className="w-3 h-3" />
                            </AvatarFallback>
                          </Avatar>
                        </>
                      )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input - Reduced padding */}
            <div className="bg-card border-t border-[hsl(var(--stroke-grey))] p-4 relative z-10">
              <div className="max-w-4xl mx-auto">
                <ChatComposer
                  mode={voiceState.mode}
                  value={newMessage}
                  onChange={setNewMessage}
                  onEnterSend={handleSendMessage}
                  onStartRecording={voiceActions.startRecording}
                  onStopRecording={voiceActions.stopRecording}
                  onSend={handleSendMessage}
                  onPickGallery={() => {}} // Not implemented for this demo
                  analyser={voiceState.analyser}
                  placeholder="Ask Tatva AI about patient analytics, pool overview, or individual patient insights..."
                  recordingTime={voiceState.recordingTime}
                  audioData={voiceState.audioData}
                  disabled={voiceState.isTranscribing}
                />
                {voiceState.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-red-600">{voiceState.error}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={voiceActions.clearError}
                        className="h-auto p-1 text-red-600 hover:text-red-700 hover:bg-red-100"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--brand-primary))] via-purple-500 to-pink-500 rounded-full opacity-20 blur-2xl"></div>
                <div className="relative bg-gradient-to-r from-[hsl(var(--brand-primary))] to-purple-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-[hsl(var(--text-100))] mb-3">Welcome to Tatva AI</h3>
              <p className="text-[hsl(var(--text-80))] leading-relaxed">
                Your intelligent patient-centric healthcare assistant is ready to help. Select a chat from the sidebar or start a new conversation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}