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

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setHasSupport(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'es-ES'; // O es-MX según preferencia regional

      rec.onstart = () => {
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
        setIsListening(false);
      };

      rec.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error !== 'no-speech') {
          setError(`Error de reconocimiento: ${event.error}`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    } catch (err: any) {
      console.error('Error al inicializar SpeechRecognition:', err);
      setHasSupport(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    if (!recognitionRef.current) {
      setError('El reconocimiento de voz no está disponible.');
      return;
    }

    // Detener cualquier síntesis de voz en curso para no escucharse a sí mismo
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    try {
      setTranscript('');
      recognitionRef.current.start();
    } catch (err: any) {
      // Si ya estaba iniciado, reiniciar
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          recognitionRef.current?.start();
        }, 150);
      } catch {
        setIsListening(false);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  }, []);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis no está soportado en este navegador.');
      if (onEnd) onEnd();
      return;
    }

    window.speechSynthesis.cancel();

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
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice =
      voices.find((v) => v.lang.startsWith('es') && v.name.includes('Natural')) ||
      voices.find((v) => v.lang === 'es-ES') ||
      voices.find((v) => v.lang.startsWith('es'));

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

    window.speechSynthesis.speak(utterance);
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
