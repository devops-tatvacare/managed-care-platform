import { useState, useCallback, useRef, useEffect } from 'react'
import { transcribeAudio } from '@/lib/whisper-transcription'
import { CHAT_RECORDING_CONFIG, CHAT_LIMITS, CHAT_ERRORS } from '@/lib/chat-config'

export type ComposerMode = 'idle' | 'recording' | 'recording-active' | 'transcribing-send' | 'transcribing-stop';

export interface VoiceRecordingState {
  mode: ComposerMode
  audioData: number[]
  transcript: string
  error: string | null
  isTranscribing: boolean
  recordingTime: number // in seconds
  analyser: AnalyserNode | null
}

export interface VoiceRecordingActions {
  startRecording: () => Promise<void>
  stopRecording: () => void
  clearTranscript: () => void
  clearError: () => void
  setMode: (mode: ComposerMode) => void
}

export interface UseVoiceRecordingOptions {
  onTranscriptionComplete?: (transcript: string) => void
}

export function useVoiceRecording(options?: UseVoiceRecordingOptions): [VoiceRecordingState, VoiceRecordingActions] {
  const [mode, setMode] = useState<ComposerMode>('idle')
  const [audioData, setAudioData] = useState<number[]>([])
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close()
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [])

  const updateAudioData = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return

    analyserRef.current.getByteFrequencyData(dataArrayRef.current)
    
    // Convert to normalized amplitude values
    const normalizedData = Array.from(dataArrayRef.current).map(value => 
      Math.min(100, (value / 255) * 100)
    )
    
    setAudioData(normalizedData)

    if (mode === 'recording') {
      animationFrameRef.current = requestAnimationFrame(updateAudioData)
    }
  }, [mode])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setMode('recording')
      setRecordingTime(0)
      
      // Check browser support
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(CHAT_ERRORS.MIC_NOT_SUPPORTED)
      }
      
      // Start timer
      startTimeRef.current = Date.now()
      timerIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
          setRecordingTime(elapsed)
          
          // Auto-stop if recording is too long
          if (elapsed >= CHAT_LIMITS.MAX_RECORDING_DURATION) {
            stopRecording()
          }
        }
      }, CHAT_RECORDING_CONFIG.TIMER_UPDATE_INTERVAL)
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: CHAT_RECORDING_CONFIG.AUDIO_CONSTRAINTS
      })

      // Setup audio analysis
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = CHAT_RECORDING_CONFIG.ANALYSER_FFT_SIZE
      
      const bufferLength = analyserRef.current.frequencyBinCount
      dataArrayRef.current = new Uint8Array(bufferLength)
      
      source.connect(analyserRef.current)
      
      // Start audio data updates
      updateAudioData()

      // Setup media recorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: CHAT_RECORDING_CONFIG.MIME_TYPE
      })
      
      audioChunksRef.current = []
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: CHAT_RECORDING_CONFIG.MIME_TYPE 
        })
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
        
        // Stop timer
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current)
          timerIntervalRef.current = null
        }
        const finalRecordingTime = startTimeRef.current 
          ? Math.floor((Date.now() - startTimeRef.current) / 1000)
          : 0
        startTimeRef.current = null
        
        // Check minimum recording duration
        if (finalRecordingTime < CHAT_LIMITS.MIN_RECORDING_DURATION) {
          setError(CHAT_ERRORS.RECORDING_TOO_SHORT)
          setMode('idle')
          setRecordingTime(0)
          return
        }
        
        // Transcribe audio using local Whisper
        setIsTranscribing(true)
        setMode('transcribing-send')
        
        try {
          const transcribedText = await transcribeAudio(audioBlob)
          
          setTranscript(transcribedText)
          
          // Call the callback if provided
          if (options?.onTranscriptionComplete && transcribedText) {
            options.onTranscriptionComplete(transcribedText)
          }
          
          setMode('idle')
        } catch (transcriptionError) {
          console.error('Transcription error:', transcriptionError)
          setError(CHAT_ERRORS.TRANSCRIPTION_FAILED)
          setMode('idle')
        } finally {
          setIsTranscribing(false)
          setRecordingTime(0)
        }
      }

      mediaRecorderRef.current.start(CHAT_RECORDING_CONFIG.DATA_COLLECTION_INTERVAL)
      setMode('recording-active')

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : CHAT_ERRORS.UNKNOWN_ERROR
      
      // Handle specific error types
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        setError(CHAT_ERRORS.MIC_PERMISSION_DENIED)
      } else if (errorMessage.includes('NotSupportedError')) {
        setError(CHAT_ERRORS.MIC_NOT_SUPPORTED)
      } else {
        setError(errorMessage)
      }
      
      setMode('idle')
      setRecordingTime(0)
    }
  }, [updateAudioData, options])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    // Timer is stopped in the onstop handler to ensure it runs with transcription
    
    setAudioData([])
  }, [])

  const clearTranscript = useCallback(() => {
    setTranscript('')
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const state: VoiceRecordingState = {
    mode,
    audioData,
    transcript,
    error,
    isTranscribing,
    recordingTime,
    analyser: analyserRef.current
  }

  const actions: VoiceRecordingActions = {
    startRecording,
    stopRecording,
    clearTranscript,
    clearError,
    setMode
  }

  return [state, actions]
}