"use client";

/** Read a message aloud with the browser's own voice for that language, if it has one. */
export function findVoice(tag: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const prefix = tag.split("-")[0].toLowerCase();
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase() === tag.toLowerCase()) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ??
    null
  );
}

export function speak(text: string, tag: string, onEnd?: () => void): boolean {
  const voice = findVoice(tag);
  if (!voice) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.92;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** Voices load asynchronously in most browsers; call back once they are ready. */
export function onVoicesReady(cb: () => void): () => void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return () => {};
  const synth = window.speechSynthesis;
  if (synth.getVoices().length) cb();
  synth.addEventListener("voiceschanged", cb);
  return () => synth.removeEventListener("voiceschanged", cb);
}

/** Best English voice for the demo voice-over: the natural voices in Microsoft Edge first. */
export function englishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const en = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  return (
    en.find((v) => /natural/i.test(v.name) && /(Aria|Jenny|Ava|Emma|Sonia|Libby)/i.test(v.name)) ??
    en.find((v) => /natural/i.test(v.name)) ??
    en.find((v) => /Google (US|UK) English/i.test(v.name)) ??
    en[0] ??
    null
  );
}

// Held here so the browser does not discard the utterance before it finishes.
const narration: { current: SpeechSynthesisUtterance | null } = { current: null };

/** Speak one line of the demo voice-over, a little slower than normal. Returns false if no English voice exists. */
export function narrate(text: string, onEnd: () => void): boolean {
  const voice = englishVoice();
  if (!voice) return false;
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.92;
  u.onend = onEnd;
  u.onerror = onEnd;
  narration.current = u;
  window.speechSynthesis.speak(u);
  return true;
}
