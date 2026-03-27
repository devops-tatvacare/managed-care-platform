import { pipeline, AutomaticSpeechRecognitionPipeline } from '@xenova/transformers';

let whisperPipeline: AutomaticSpeechRecognitionPipeline | null = null;
let isInitializing = false;

async function initializeWhisper(): Promise<AutomaticSpeechRecognitionPipeline> {
  if (whisperPipeline) {
    return whisperPipeline;
  }

  if (isInitializing) {
    // Wait for ongoing initialization
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (whisperPipeline) {
      return whisperPipeline;
    }
  }

  try {
    isInitializing = true;
    console.log('Loading Whisper model...');
    
    whisperPipeline = await pipeline(
      'automatic-speech-recognition', 
      'Xenova/whisper-small',
      {
        // Use quantized model for better performance
        quantized: true,
        // Set device to CPU for broader compatibility
        device: 'cpu',
        // Progress callback to track loading
        progress_callback: (progress: any) => {
          if (progress.status === 'progress') {
            console.log(`Loading model: ${progress.name} - ${Math.round(progress.progress)}%`);
          }
        }
      }
    );
    
    console.log('Whisper model loaded successfully');
    return whisperPipeline;
  } catch (error) {
    console.error('Failed to initialize Whisper:', error);
    throw error;
  } finally {
    isInitializing = false;
  }
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    console.log('🎙️ Starting transcription...');
    
    // Initialize Whisper if needed
    console.log('🔄 Initializing Whisper model...');
    const pipeline = await initializeWhisper();
    
    // Convert blob to ArrayBuffer
    console.log('📄 Processing audio file...');
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // Convert to Float32Array (required by Xenova transformers)
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Get first channel data
    const audioData = audioBuffer.getChannelData(0);
    
    console.log('🎵 Transcribing audio with Whisper...');
    
    // Transcribe with Whisper
    const result = await pipeline(audioData, {
      // Optimize for healthcare/medical terminology
      task: 'transcribe',
      language: 'english',
      // Return timestamps for debugging if needed
      return_timestamps: false,
    });
    
    // Extract text from result
    const transcript = typeof result === 'object' && result !== null && 'text' in result 
      ? (result as any).text 
      : String(result);
    
    console.log('✅ Transcription completed:', transcript);
    
    // Clean up audio context
    await audioContext.close();
    
    return transcript.trim();
  } catch (error) {
    console.error('❌ Transcription failed:', error);
    throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Utility function to check if Whisper is ready
export function isWhisperReady(): boolean {
  return whisperPipeline !== null;
}

// Utility function to get initialization status
export function getWhisperStatus(): 'uninitialized' | 'initializing' | 'ready' {
  if (whisperPipeline) return 'ready';
  if (isInitializing) return 'initializing';
  return 'uninitialized';
}

// Preload function to initialize Whisper early
export async function preloadWhisper(): Promise<void> {
  try {
    await initializeWhisper();
  } catch (error) {
    console.warn('Failed to preload Whisper model:', error);
  }
}