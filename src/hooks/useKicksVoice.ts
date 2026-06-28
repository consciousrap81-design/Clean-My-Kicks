import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const KICKS_VOICE_STORAGE_KEY = "kicks.voice.prefs.v1";
export type KicksVoiceId = "alloy" | "coral" | "nova" | "sage" | "shimmer" | "ballad" | "fable";
export type KicksVoicePrefs = {
  voice: KicksVoiceId;
  instructions?: string;
  speed?: number;
  useAiVoice: boolean;
};
const DEFAULT_VOICE_PREFS: KicksVoicePrefs = {
  voice: "coral",
  instructions: "",
  speed: 1.0,
  useAiVoice: true,
};
function readVoicePrefs(): KicksVoicePrefs {
  if (typeof window === "undefined") return DEFAULT_VOICE_PREFS;
  try {
    const raw = window.localStorage.getItem(KICKS_VOICE_STORAGE_KEY);
    if (!raw) return DEFAULT_VOICE_PREFS;
    return { ...DEFAULT_VOICE_PREFS, ...JSON.parse(raw) };
  } catch { return DEFAULT_VOICE_PREFS; }
}

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

const COMMAND_SILENCE_MS = 1300;
const COMMAND_TIMEOUT_MS = 9000;
// How long the conversation stays "open" after a command before requiring
// the wake word again. Resets on every new utterance.
const CONVERSATION_IDLE_MS = 60000;

let currentAudio: HTMLAudioElement | null = null;
let isSpeakingFlag = false;
function stopCurrentAudio() {
  try { currentAudio?.pause(); } catch {}
  if (currentAudio) {
    try { URL.revokeObjectURL(currentAudio.src); } catch {}
    currentAudio = null;
  }
  try { window.speechSynthesis?.cancel(); } catch {}
  isSpeakingFlag = false;
}
export function isKicksSpeaking() { return isSpeakingFlag; }

async function speakWithAiGateway(text: string, prefs: KicksVoicePrefs): Promise<boolean> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kicks-tts`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        text,
        voice: prefs.voice,
        instructions: prefs.instructions || undefined,
        speed: prefs.speed ?? 1.0,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn("[kicks-tts] function returned non-OK", res.status, detail);
      throw new Error(`TTS failed: ${res.status}`);
    }
    const audio = await res.arrayBuffer();
    if (!audio || audio.byteLength === 0) return false;
    const blob = new Blob([audio], { type: "audio/mpeg" });
    const urlObj = URL.createObjectURL(blob);
    stopCurrentAudio();
    const a = new Audio(urlObj);
    currentAudio = a;
    isSpeakingFlag = true;
    a.onended = () => {
      try { URL.revokeObjectURL(urlObj); } catch {}
      if (currentAudio === a) { currentAudio = null; isSpeakingFlag = false; }
    };
    a.onpause = () => { if (a.ended || currentAudio !== a) isSpeakingFlag = false; };
    await a.play();
    return true;
  } catch (e) {
    console.warn("[kicks-tts] AI voice failed, falling back to browser TTS", e);
    return false;
  }
}

function speakWithBrowser(text: string) {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    u.pitch = 1;
    isSpeakingFlag = true;
    u.onend = () => { isSpeakingFlag = false; };
    u.onerror = () => { isSpeakingFlag = false; };
    window.speechSynthesis.speak(u);
  } catch {}
}

export async function previewKicksVoice(prefs: KicksVoicePrefs, sample?: string) {
  const text = sample || "Hey! I'm Kicks. Ready whenever you need a hand around the shop.";
  const ok = prefs.useAiVoice ? await speakWithAiGateway(text, prefs) : false;
  if (!ok) speakWithBrowser(text);
}

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
  onInterrupt?: () => void;
}) {
  const { enabled, onCommand, onInterrupt, mode = "wake", sensitivity = "medium" } = opts;
  const [listening, setListening] = useState(false);
  const [heardWake, setHeardWake] = useState(false);
  const [lastHeard, setLastHeard] = useState("");
  const [pushActive, setPushActive] = useState(false);
  const recRef = useRef<SR | null>(null);
  const awaitingCommandRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;
  const onInterruptRef = useRef(onInterrupt);
  onInterruptRef.current = onInterrupt;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const sensitivityRef = useRef(sensitivity);
  sensitivityRef.current = sensitivity;
  const pushBufferRef = useRef<string>("");
  const wakeTriggeredRef = useRef(false);
  const commandFinalRef = useRef("");
  const commandInterimRef = useRef("");
  const commandTimerRef = useRef<any>(null);
  const commandTimeoutRef = useRef<any>(null);
  const conversationIdleRef = useRef<any>(null);
  const lastFinalChunkRef = useRef("");

  const clearCommandTimers = useCallback(() => {
    if (commandTimerRef.current) { clearTimeout(commandTimerRef.current); commandTimerRef.current = null; }
    if (commandTimeoutRef.current) { clearTimeout(commandTimeoutRef.current); commandTimeoutRef.current = null; }
  }, []);

  const endConversation = useCallback(() => {
    if (conversationIdleRef.current) { clearTimeout(conversationIdleRef.current); conversationIdleRef.current = null; }
    wakeTriggeredRef.current = false;
    awaitingCommandRef.current = false;
    setHeardWake(false);
  }, []);

  const bumpConversationIdle = useCallback(() => {
    if (conversationIdleRef.current) clearTimeout(conversationIdleRef.current);
    conversationIdleRef.current = setTimeout(endConversation, CONVERSATION_IDLE_MS);
  }, [endConversation]);

  const currentCommandText = useCallback(() => {
    return [commandFinalRef.current, commandInterimRef.current].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }, []);

  // Reset only the per-command buffers. In wake mode we KEEP the conversation
  // open (wakeTriggered + awaiting) so the user can keep talking without
  // saying "Hey Kicks" again. A separate idle timer ends the conversation
  // after CONVERSATION_IDLE_MS of silence.
  const resetCommandState = useCallback((opts?: { endConversation?: boolean }) => {
    commandFinalRef.current = "";
    commandInterimRef.current = "";
    lastFinalChunkRef.current = "";
    clearCommandTimers();
    const shouldEnd = opts?.endConversation || modeRef.current !== "wake";
    if (shouldEnd) {
      awaitingCommandRef.current = false;
      wakeTriggeredRef.current = false;
      setHeardWake(false);
      if (conversationIdleRef.current) { clearTimeout(conversationIdleRef.current); conversationIdleRef.current = null; }
    } else {
      // Stay open for follow-up questions.
      awaitingCommandRef.current = true;
      wakeTriggeredRef.current = true;
      bumpConversationIdle();
    }
  }, [clearCommandTimers, bumpConversationIdle]);

  const flushCommand = useCallback(() => {
    const text = currentCommandText();
    resetCommandState();
    if (text) onCommandRef.current(text);
  }, [currentCommandText, resetCommandState]);

  const scheduleCommandFlush = useCallback((delay = COMMAND_SILENCE_MS) => {
    if (commandTimerRef.current) clearTimeout(commandTimerRef.current);
    commandTimerRef.current = setTimeout(flushCommand, delay);
  }, [flushCommand]);

  const scheduleCommandTimeout = useCallback(() => {
    if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
    // If the user starts speaking but never finishes, give up on this command
    // buffer but keep the conversation open in wake mode.
    commandTimeoutRef.current = setTimeout(() => resetCommandState(), COMMAND_TIMEOUT_MS);
  }, [resetCommandState]);

  const cleanCommandChunk = useCallback((text: string) => {
    const withoutWake = stripWakeWord(text, sensitivityRef.current);
    return (withoutWake ?? normalize(text)).trim();
  }, []);

  const appendFinalCommand = useCallback((text: string) => {
    const chunk = cleanCommandChunk(text);
    if (!chunk || chunk === lastFinalChunkRef.current) return;
    lastFinalChunkRef.current = chunk;
    commandFinalRef.current = [commandFinalRef.current, chunk].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    commandInterimRef.current = "";
  }, [cleanCommandChunk]);

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
      if (!stopRequestedRef.current && awaitingCommandRef.current && currentCommandText()) {
        scheduleCommandFlush(250);
      }
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

      // Mute-while-speaking: ignore anything the recognizer picks up while
      // Kicks is talking so she doesn't hear herself and interrupt her own
      // response. Voice barge-in is intentionally disabled in this mode —
      // use the Stop button or typed input to interrupt.
      if (isSpeakingFlag) return;

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
          scheduleCommandTimeout();
          bumpConversationIdle();
          // If the wake word arrived with a trailing command in the same utterance,
          // seed the command buffer with it.
          if (after.length > 0) {
            if (finalText && !interim) commandFinalRef.current = after;
            else commandInterimRef.current = after;
            scheduleCommandFlush();
          }
        }
      } else if (awaitingCommandRef.current) {
        // After wake: accumulate command text. Prefer final segments; fall back
        // to interim so a 1-2s pause flushes even without a final result.
        if (finalText) {
          appendFinalCommand(finalText);
        } else if (interim) {
          // Replace the trailing interim portion instead of appending every
          // interim update. This prevents duplicated commands in continuous mode.
          commandInterimRef.current = cleanCommandChunk(interim);
        }
        if (currentCommandText()) scheduleCommandFlush();
        scheduleCommandTimeout();
        bumpConversationIdle();
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
    resetCommandState();
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    stopCurrentAudio();
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

  const speak = useCallback(async (text: string) => {
    if (!enabled) return;
    const clean = text.replace(/```[\s\S]*?```/g, "").replace(/[*_#>`]/g, "").slice(0, 1500);
    if (!clean.trim()) return;
    const prefs = readVoicePrefs();
    const ok = prefs.useAiVoice ? await speakWithAiGateway(clean, prefs) : false;
    if (!ok) speakWithBrowser(clean);
  }, [enabled]);

  return { listening, heardWake, lastHeard, pushActive, speak, pushStart, pushEnd, supported: voiceSupported };
}