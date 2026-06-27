import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Browser-native voice control for "Kicks".
 * Modes:
 *   - "wake": continuously listens for the wake word ("Hey Kicks").
 *   - "push": only listens while pushStart()/pushEnd() bracket the speech (push-to-talk).
 * Adjustable wake-word sensitivity: "strict" | "medium" | "loose".
 * Speaks AI replies via window.speechSynthesis. No audio leaves the browser.
 */

type SR = any;
const SRClass: any =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export const voiceSupported = !!SRClass && typeof window !== "undefined" && "speechSynthesis" in window;

export type VoiceMode = "wake" | "push";
export type WakeSensitivity = "strict" | "medium" | "loose";

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

const WAKE_PATTERNS: Record<WakeSensitivity, string[]> = {
  strict: ["hey kicks", "okay kicks"],
  medium: ["hey kicks", "hi kicks", "ok kicks", "okay kicks", "yo kicks"],
  loose: ["hey kicks", "hi kicks", "ok kicks", "okay kicks", "yo kicks", "kicks", "kix", "ticks", "kick"],
};

function stripWakeWord(text: string, sensitivity: WakeSensitivity): string | null {
  const t = normalize(text);
  for (const p of WAKE_PATTERNS[sensitivity]) {
    const idx = t.indexOf(p);
    if (idx !== -1) return t.slice(idx + p.length).trim();
  }
  return null;
}

export function useKicksVoice(opts: {
  enabled: boolean;
  mode?: VoiceMode;
  sensitivity?: WakeSensitivity;
  onCommand: (text: string) => void;
}) {
  const { enabled, onCommand, mode = "wake", sensitivity = "medium" } = opts;
  const [listening, setListening] = useState(false);
  const [heardWake, setHeardWake] = useState(false);
  const [lastHeard, setLastHeard] = useState("");
  const [pushActive, setPushActive] = useState(false);
  const recRef = useRef<SR | null>(null);
  const awaitingCommandRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const sensitivityRef = useRef(sensitivity);
  sensitivityRef.current = sensitivity;
  const pushBufferRef = useRef<string>("");
  const wakeTriggeredRef = useRef(false);
  const commandBufferRef = useRef("");
  const commandTimerRef = useRef<any>(null);

  const flushCommand = useCallback(() => {
    const text = commandBufferRef.current.trim();
    commandBufferRef.current = "";
    if (commandTimerRef.current) { clearTimeout(commandTimerRef.current); commandTimerRef.current = null; }
    awaitingCommandRef.current = false;
    wakeTriggeredRef.current = false;
    setHeardWake(false);
    if (text) onCommandRef.current(text);
  }, []);

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
      // In wake mode keep listening; push mode only listens while held.
      if (!stopRequestedRef.current && modeRef.current === "wake") {
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

      // Push-to-talk: just accumulate; we deliver on pushEnd().
      if (modeRef.current === "push") {
        if (finalText) pushBufferRef.current = (pushBufferRef.current + " " + finalText).trim();
        return;
      }

      // Wake-word detection uses BOTH interim + final so it triggers fast,
      // without waiting for the recognizer's slow final cut.
      if (!wakeTriggeredRef.current) {
        const after = stripWakeWord(live, sensitivityRef.current);
        if (after !== null) {
          wakeTriggeredRef.current = true;
          setHeardWake(true);
          awaitingCommandRef.current = true;
          try {
            const u = new SpeechSynthesisUtterance("Yes?");
            u.rate = 1.1;
            window.speechSynthesis.speak(u);
          } catch {}
          // If the wake word arrived with a trailing command in the same utterance,
          // seed the command buffer with it.
          if (after.length > 0) commandBufferRef.current = after;
        }
      } else if (awaitingCommandRef.current) {
        // After wake: accumulate command text. Prefer final segments; fall back
        // to interim so a 1-2s pause flushes even without a final result.
        if (finalText) {
          commandBufferRef.current = (commandBufferRef.current + " " + finalText).trim();
        } else if (interim) {
          // Replace the trailing interim portion so we always reflect latest.
          // Keep any already-finalized prefix intact by storing finals separately
          // via finalText path above; interim alone seeds buffer if empty.
          if (!commandBufferRef.current) commandBufferRef.current = interim.trim();
          else commandBufferRef.current = (commandBufferRef.current + " " + interim).trim();
        }
        if (commandTimerRef.current) clearTimeout(commandTimerRef.current);
        commandTimerRef.current = setTimeout(flushCommand, 1400);
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
    setPushActive(false);
    pushBufferRef.current = "";
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    try { window.speechSynthesis.cancel(); } catch {}
  }, []);

  const pushStart = useCallback(() => {
    if (!enabled || modeRef.current !== "push") return;
    pushBufferRef.current = "";
    setPushActive(true);
    start();
  }, [enabled, start]);

  const pushEnd = useCallback(() => {
    if (modeRef.current !== "push") return;
    setPushActive(false);
    stopRequestedRef.current = true;
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    const text = pushBufferRef.current.trim();
    pushBufferRef.current = "";
    if (text) onCommandRef.current(text);
  }, []);

  useEffect(() => {
    if (enabled && mode === "wake") start();
    else stop();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, mode]);

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

  return { listening, heardWake, lastHeard, pushActive, speak, pushStart, pushEnd, supported: voiceSupported };
}