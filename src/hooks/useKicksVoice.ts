import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Browser-native voice control for "Kicks".
 * - Continuously listens for the wake word "Hey Kicks" using webkitSpeechRecognition.
 * - Captures the rest of the utterance (or the next utterance) as the command.
 * - Speaks AI replies back through window.speechSynthesis.
 *
 * No audio leaves the browser. No backend dependency.
 */

type SR = any;
const SRClass: any =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export const voiceSupported = !!SRClass && typeof window !== "undefined" && "speechSynthesis" in window;

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function stripWakeWord(text: string): string | null {
  const t = normalize(text);
  const patterns = ["hey kicks", "hi kicks", "ok kicks", "okay kicks", "yo kicks", "kicks"];
  for (const p of patterns) {
    const idx = t.indexOf(p);
    if (idx !== -1) {
      const rest = t.slice(idx + p.length).trim();
      return rest;
    }
  }
  return null;
}

export function useKicksVoice(opts: {
  enabled: boolean;
  onCommand: (text: string) => void;
}) {
  const { enabled, onCommand } = opts;
  const [listening, setListening] = useState(false);
  const [heardWake, setHeardWake] = useState(false);
  const [lastHeard, setLastHeard] = useState("");
  const recRef = useRef<SR | null>(null);
  const awaitingCommandRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;

  const start = useCallback(() => {
    if (!SRClass) return;
    if (recRef.current) return;
    const rec: SR = new SRClass();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onstart = () => setListening(true);
    rec.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        stopRequestedRef.current = true;
      }
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      if (!stopRequestedRef.current) {
        // Restart on natural end (Chrome stops after silence)
        setTimeout(() => start(), 200);
      }
    };
    rec.onresult = (event: any) => {
      let finalText = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript + " ";
        else interim += r[0].transcript + " ";
      }
      const live = (finalText + interim).trim();
      if (live) setLastHeard(live);

      if (!finalText) return;
      const text = finalText.trim();

      if (awaitingCommandRef.current) {
        // Treat this final utterance as the command body
        awaitingCommandRef.current = false;
        setHeardWake(false);
        if (text) onCommandRef.current(text);
        return;
      }

      const after = stripWakeWord(text);
      if (after !== null) {
        setHeardWake(true);
        if (after.length > 0) {
          // Wake word + command in same utterance
          setHeardWake(false);
          onCommandRef.current(after);
        } else {
          // Wake word alone — capture the next final utterance
          awaitingCommandRef.current = true;
          // Audible cue
          try {
            const u = new SpeechSynthesisUtterance("Yes?");
            u.rate = 1.1;
            window.speechSynthesis.speak(u);
          } catch {}
        }
      }
    };
    recRef.current = rec;
    stopRequestedRef.current = false;
    try { rec.start(); } catch {}
  }, []);

  const stop = useCallback(() => {
    stopRequestedRef.current = true;
    awaitingCommandRef.current = false;
    setHeardWake(false);
    setListening(false);
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    try { window.speechSynthesis.cancel(); } catch {}
  }, []);

  useEffect(() => {
    if (enabled) start();
    else stop();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const speak = useCallback((text: string) => {
    if (!enabled) return;
    if (!("speechSynthesis" in window)) return;
    const clean = text.replace(/```[\s\S]*?```/g, "").replace(/[*_#>`]/g, "").slice(0, 800);
    if (!clean.trim()) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.rate = 1.05;
      u.pitch = 1;
      window.speechSynthesis.speak(u);
    } catch {}
  }, [enabled]);

  return { listening, heardWake, lastHeard, speak, supported: voiceSupported };
}