// Chat Configuration for EMPI Platform
// Adapted from health-app chat config to match current project context

export const CHAT_UI = {
  PLACEHOLDER: "Type your message or press mic to record...",
  VOICE_PLACEHOLDER: "Recording... Speak now",
  TRANSCRIBING_PLACEHOLDER: "Transcribing your message...",
  SEND_BUTTON_ARIA: "Send message",
  MIC_BUTTON_ARIA: "Start voice recording",
  GALLERY_BUTTON_ARIA: "Attach from gallery",
  STOP_RECORDING_ARIA: "Stop recording",
  SEND_RECORDING_ARIA: "Send recording",
};

export const CHAT_FEATURES = {
  VOICE_RECORDING: true,
  GALLERY_UPLOAD: true,
  TEXT_INPUT: true,
  AUTO_TRANSCRIPTION: true,
  WAVEFORM_VISUALIZATION: true,
};

export const CHAT_LIMITS = {
  MAX_MESSAGE_LENGTH: 2000,
  MAX_RECORDING_DURATION: 300, // 5 minutes in seconds
  MIN_RECORDING_DURATION: 1,   // 1 second minimum
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
};

export const CHAT_RECORDING_CONFIG = {
  AUDIO_CONSTRAINTS: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  MIME_TYPE: 'audio/webm;codecs=opus',
  SAMPLE_RATE: 16000, // Whisper prefers 16kHz
  ANALYSER_FFT_SIZE: 256,
  DATA_COLLECTION_INTERVAL: 100, // ms
  TIMER_UPDATE_INTERVAL: 100, // ms for smooth display
};

export const CHAT_TRANSCRIPTION_CONFIG = {
  MODEL: 'Xenova/whisper-small',
  LANGUAGE: 'english',
  TASK: 'transcribe',
  RETURN_TIMESTAMPS: false,
  QUANTIZED: true,
  DEVICE: 'cpu',
};

export const CHAT_STYLES = {
  COMPOSER_HEIGHT: {
    MIN: '2.5rem', // 40px
    MAX: '6rem',   // 96px
  },
  BUTTON_SIZE: '2.5rem', // 40px
  ICON_SIZE: '1.25rem',  // 20px
  BORDER_RADIUS: '0.5rem', // 8px - matches design system
  SPACING: {
    INTERNAL: '0.5rem',  // 8px
    EXTERNAL: '1rem',    // 16px
  },
};

export const CHAT_ANIMATIONS = {
  WAVEFORM: {
    BARS: 32,
    BAR_WIDTH: 2,
    BAR_GAP: 1,
    MIN_HEIGHT: 2,
    MAX_HEIGHT: 40,
    ANIMATION_SPEED: 60, // fps
  },
  HOURGLASS: {
    ROTATION_DURATION: 2000, // ms
    PARTICLE_COUNT: 20,
    PARTICLE_SIZE: 2,
  },
  TRANSITIONS: {
    FAST: 150,   // ms
    NORMAL: 300, // ms
    SLOW: 500,   // ms
  },
};

export const CHAT_COLORS = {
  PRIMARY: 'hsl(var(--brand-primary))',
  PRIMARY_HOVER: 'hsl(var(--brand-primary) / 0.9)',
  MUTED: 'hsl(var(--muted-foreground))',
  MUTED_HOVER: 'hsl(var(--muted) / 0.8)',
  DANGER: 'hsl(var(--danger))',
  DANGER_HOVER: 'hsl(var(--danger) / 0.9)',
  BACKGROUND: 'hsl(var(--muted))',
  BORDER: 'hsl(var(--border))',
  RING: 'hsl(var(--ring))',
};

export const CHAT_ACCESSIBILITY = {
  LIVE_REGION_ARIA: 'polite' as const,
  RECORDING_ARIA: 'Recording voice message',
  TRANSCRIBING_ARIA: 'Transcribing voice message',
  WAVEFORM_ARIA: 'Voice recording waveform visualization',
  COMPOSER_ARIA: 'Chat message input',
  SEND_SHORTCUT: 'Enter',
  NEW_LINE_SHORTCUT: 'Shift+Enter',
};

export const CHAT_ERRORS = {
  MIC_PERMISSION_DENIED: 'Microphone access denied. Please allow microphone permissions to use voice recording.',
  MIC_NOT_SUPPORTED: 'Voice recording is not supported in this browser.',
  TRANSCRIPTION_FAILED: 'Failed to transcribe audio. Please try again.',
  RECORDING_TOO_SHORT: 'Recording too short. Please record for at least 1 second.',
  RECORDING_TOO_LONG: 'Recording too long. Maximum duration is 5 minutes.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNKNOWN_ERROR: 'An unknown error occurred. Please try again.',
};