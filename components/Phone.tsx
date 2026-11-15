"use client";

import { useEffect, useState } from "react";
import { langInfo } from "@/data/languages";
import { SEVERITY } from "@/lib/severity";
import { findVoice, onVoicesReady, speak, stopSpeaking } from "@/lib/speak";
import type { Message, Severity, WorkerGroup } from "@/lib/types";

const BARS = [6, 11, 16, 9, 14, 20, 12, 7, 15, 18, 10, 6, 13, 17, 9, 12, 19, 8, 11, 7, 14, 10];

export function spokenText(msg: Message) {
  return msg.lines
    .filter((l) => l.role === "headline" || l.role === "body" || l.role === "action")
    .map((l) => l.text)
    .join(" ");
}

export function VoiceNote({ msg, light = true }: { msg: Message; light?: boolean }) {
  const info = langInfo(msg.lang);
  const [hasVoice, setHasVoice] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => onVoicesReady(() => setHasVoice(!!findVoice(info.speech))), [info.speech]);
  useEffect(() => () => stopSpeaking(), []);

  const toggle = () => {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }
    if (speak(spokenText(msg), info.speech, () => setPlaying(false))) setPlaying(true);
    else setHasVoice(false);
  };

  if (hasVoice === false) {
    return (
      <p className={`rounded-lg px-3 py-2 text-[11px] leading-snug ${light ? "bg-white/70 text-ink/70" : "bg-deep text-mist-dim"}`}>
        No {info.name} voice in this browser. Microsoft Edge includes one.
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={hasVoice === null}
      className={`flex w-full items-center gap-2.5 rounded-full px-2.5 py-1.5 text-left disabled:opacity-50 ${light ? "bg-white text-ink" : "bg-deep text-mist"}`}
      aria-label={playing ? `Stop ${info.name} voice note` : `Play ${info.name} voice note`}
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-white">
        {playing ? (
          <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden><rect x="1" y="1" width="3" height="8" fill="currentColor" /><rect x="6" y="1" width="3" height="8" fill="currentColor" /></svg>
        ) : (
          <svg viewBox="0 0 10 10" className="ml-0.5 size-2.5" aria-hidden><path d="M1 0.5 L9.5 5 L1 9.5 Z" fill="currentColor" /></svg>
        )}
      </span>
      <span className="flex h-5 flex-1 items-center gap-[2px]" aria-hidden>
        {BARS.map((h, i) => (
          <span key={i} className={`w-[3px] rounded-full ${playing ? "bg-ink" : "bg-ink/35"}`} style={{ height: h }} />
        ))}
      </span>
      <span className="pr-1 text-[11px] tabular-nums opacity-60">{info.name}</span>
    </button>
  );
}

export function MessageBody({ msg, severity, showEnglish }: { msg: Message; severity: Severity; showEnglish?: boolean }) {
  const dir = langInfo(msg.lang).dir;
  const sev = SEVERITY[severity];
  const actions = msg.lines.filter((l) => l.role === "action");
  const Gloss = ({ en }: { en: string }) =>
    showEnglish ? (
      <span dir="ltr" className="mt-0.5 block text-[11.5px] font-normal italic leading-snug text-ink/55">
        {en}
      </span>
    ) : null;

  return (
    <div dir={dir} lang={msg.lang} className="space-y-1.5 text-start">
      {msg.lines
        .filter((l) => l.role === "headline")
        .map((l) => (
          <p key={l.key} className="flex items-start gap-1.5 text-[15px] font-bold leading-snug">
            <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: sev.color }} aria-hidden />
            <span>
              {l.text}
              <Gloss en={l.en} />
            </span>
          </p>
        ))}
      {msg.lines
        .filter((l) => l.role === "body")
        .map((l) => (
          <p key={l.key} className="text-[13.5px] leading-relaxed">
            {l.text}
            <Gloss en={l.en} />
          </p>
        ))}
      {actions.length > 0 && (
        <ul className="space-y-1 border-s-2 ps-2.5 text-[13.5px] font-bold leading-snug" style={{ borderColor: sev.color }}>
          {actions.map((l) => (
            <li key={l.key}>
              {l.text}
              <Gloss en={l.en} />
            </li>
          ))}
        </ul>
      )}
      {msg.lines
        .filter((l) => l.role === "route")
        .map((l) => (
          <a
            key={l.key + l.text}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-md bg-ink/[0.06] px-2 py-1.5 text-[12.5px] font-bold text-ink underline-offset-2 hover:underline"
          >
            <svg viewBox="0 0 12 16" className="size-3 shrink-0" aria-hidden>
              <path d="M6 0a6 6 0 0 0-6 6c0 4.5 6 10 6 10s6-5.5 6-10a6 6 0 0 0-6-6Zm0 8.2A2.2 2.2 0 1 1 6 3.8a2.2 2.2 0 0 1 0 4.4Z" fill="currentColor" />
            </svg>
            <span>
              {l.text}
              <Gloss en={l.en} />
            </span>
          </a>
        ))}
      {msg.lines
        .filter((l) => l.role === "source")
        .map((l) => (
          <p key={l.key} className="pt-0.5 text-[11px] leading-snug text-ink/60">
            {l.text}
            <Gloss en={l.en} />
          </p>
        ))}
    </div>
  );
}

export function Phone({
  group,
  msg,
  severity,
  delay,
  time,
}: {
  group: WorkerGroup;
  msg: Message;
  severity: Severity;
  delay: number;
  time: string;
}) {
  const info = langInfo(group.lang);
  return (
    <article
      className="arrive rounded-[26px] border border-[#2a2a2a] bg-[#1b1b1b] p-1.5 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.5)]"
      style={{ animationDelay: `${delay}ms` }}
      aria-label={`${group.name} group chat, ${info.name}`}
    >
      <div className="overflow-hidden rounded-[21px] bg-chat text-ink">
        <header className="flex items-center gap-2 border-b border-line bg-white px-3 py-2 text-ink">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-deep text-[11px] font-bold">
            {group.name.slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-bold">{group.name}</span>
            <span className="block truncate text-[11px] text-mist-dim">
              {group.members} {group.community.toLowerCase()}
            </span>
          </span>
          <span className="text-[11px] text-mist-dim">{info.native}</span>
        </header>
        <div className="space-y-2 p-2.5">
          <div className="rounded-xl rounded-ss-sm bg-white p-3 shadow-sm">
            <p className="mb-1.5 text-[11px] font-bold text-ink/50">Faham</p>
            <MessageBody msg={msg} severity={severity} />
            <p className="mt-1 text-end text-[10px] tabular-nums text-ink/40">{time}</p>
          </div>
          <VoiceNote msg={msg} />
        </div>
      </div>
    </article>
  );
}
