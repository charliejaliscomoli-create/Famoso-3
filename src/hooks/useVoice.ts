import { useState, useEffect, useCallback, useRef } from 'react';

interface UseVoiceReturn {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string, onEnd?: () => void) => void;
  stopSpeaking: () => void;
  hasSupport: boolean;
  error: string | null;
}

export const useVoice = (onResult?: (text: string) => void): UseVoiceReturn => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasSupport, setHasSupport] = useState(true);

  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  const isRecognizingRef = useRef<boolean>(false);
  const isStartingRef = useRef<boolean>(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // Pre-load available speech synthesis voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      try {
        const available = window.speechSynthesis.getVoices();
        if (available && available.length > 0) {
          voicesRef.current = available;
        }
      } catch {
        // ignore
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const createRecognitionInstance = useCallback(() => {
    if (typeof window === 'undefined') return null;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setHasSupport(false);
      return null;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'es-ES';

      rec.onstart = () => {
        isRecognizingRef.current = true;
        isStartingRef.current = false;
        setIsListening(true);
        setError(null);
      };

      rec.onresult = (event: any) => {
        const results = event.results;
        if (results && results.length > 0) {
          const spokenText = results[0][0].transcript.trim();
          setTranscript(spokenText);
          if (onResultRef.current && spokenText) {
            onResultRef.current(spokenText);
          }
        }
        // Note: Do NOT set isListening to false here.
        // Wait for onend to ensure the browser audio pipeline has cleanly closed.
      };

      rec.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        isRecognizingRef.current = false;
        isStartingRef.current = false;
        setIsListening(false);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setError(`Error de reconocimiento: ${event.error}`);
        }
      };

      rec.onend = () => {
        isRecognizingRef.current = false;
        isStartingRef.current = false;
        setIsListening(false);
      };

      recognitionRef.current = rec;
      return rec;
    } catch (err: any) {
      console.error('Error al inicializar SpeechRecognition:', err);
      setHasSupport(false);
      return null;
    }
  }, []);

  useEffect(() => {
    createRecognitionInstance();

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      isRecognizingRef.current = false;
      isStartingRef.current = false;
    };
  }, [createRecognitionInstance]);

  const startListening = useCallback(() => {
    setError(null);

    // Stop ongoing speech synthesis so mic doesn't capture it
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
      setIsSpeaking(false);
    }

    // If already active or in process of starting, ignore to prevent duplicate starts
    if (isRecognizingRef.current || isStartingRef.current) {
      return;
    }

    let rec = recognitionRef.current;
    if (!rec) {
      rec = createRecognitionInstance();
      if (!rec) {
        setError('El reconocimiento de voz no está disponible.');
        return;
      }
    }

    isStartingRef.current = true;
    setTranscript('');

    try {
      rec.start();
    } catch (err: any) {
      isStartingRef.current = false;

      // If the engine is already started according to the browser, sync state safely
      if (err.name === 'InvalidStateError' || (err.message && err.message.includes('already started'))) {
        isRecognizingRef.current = true;
        setIsListening(true);
        return;
      }

      console.warn('Error iniciando reconocimiento, recreando instancia:', err);

      // Cleanly reset and re-attempt
      try {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {
            // ignore
          }
        }
        const freshRec = createRecognitionInstance();
        if (freshRec) {
          setTimeout(() => {
            try {
              if (!isRecognizingRef.current && !isStartingRef.current) {
                isStartingRef.current = true;
                freshRec.start();
              }
            } catch (retryErr) {
              console.warn('Fallo en reintento de reconocimiento:', retryErr);
              isStartingRef.current = false;
              isRecognizingRef.current = false;
              setIsListening(false);
            }
          }, 150);
        }
      } catch {
        setIsListening(false);
        isRecognizingRef.current = false;
        isStartingRef.current = false;
      }
    }
  }, [createRecognitionInstance]);

  const stopListening = useCallback(() => {
    isStartingRef.current = false;
    if (recognitionRef.current) {
      try {
        // abort() immediately halts listening and frees the audio stream
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }
    isRecognizingRef.current = false;
    setIsListening(false);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
      setIsSpeaking(false);
    }
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis no está soportado en este navegador.');
      if (onEnd) onEnd();
      return;
    }

    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }

    if (!text || !text.trim()) {
      setIsSpeaking(false);
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = 'es-ES';
    utterance.rate = 1.05; // Ritmo fluido y natural
    utterance.pitch = 1.0;

    // Intentar seleccionar una voz nativa en español de buena calidad
    const availableVoices =
      voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();

    const spanishVoice =
      availableVoices.find((v) => v.lang.startsWith('es') && v.name.toLowerCase().includes('natural')) ||
      availableVoices.find(
        (v) =>
          v.lang.startsWith('es') &&
          (v.name.toLowerCase().includes('google') ||
            v.name.toLowerCase().includes('sabina') ||
            v.name.toLowerCase().includes('diego'))
      ) ||
      availableVoices.find((v) => v.lang === 'es-ES') ||
      availableVoices.find((v) => v.lang.startsWith('es'));

    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('Error en SpeechSynthesis:', e);
      setIsSpeaking(false);
      if (onEnd) onEnd();
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Error al invocar speak:', err);
      setIsSpeaking(false);
      if (onEnd) onEnd();
    }
  }, []);

  return {
    isListening,
    isSpeaking,
    transcript,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    hasSupport,
    error,
  };
};
