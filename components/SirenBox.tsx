"use client";

import { useEffect, useRef, useState } from "react";
import type { WorkerGroup } from "@/lib/types";

type DeviceReply = {
  level: "none" | "normal" | "waspada" | "amaran" | "bahaya";
  led: string;
  buzz: number[];
  headline: string | null;
  headline_en?: string;
  issued?: string;
  source?: string;
  sample?: boolean;
  error?: string;
};

/** Plays the buzzer pattern: [on ms, off ms, on ms, ...]. */
function buzz(pattern: number[]) {
  if (!pattern.length || typeof window === "undefined") return;
  const ctx = new AudioContext();
  let t = ctx.currentTime + 0.05;
  pattern.forEach((ms, i) => {
    if (i % 2 === 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.value = 0.05;
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + ms / 1000);
    }
    t += ms / 1000;
  });
  setTimeout(() => ctx.close(), (t - ctx.currentTime) * 1000 + 300);
}

/**
 * On-screen twin of the ESP32 siren box in iot/dorm-siren. It calls the same
 * device endpoint the hardware polls, then shows what the box would do.
 */
export function SirenBox({ group, trigger, sampleId }: { group: WorkerGroup; trigger: number; sampleId: string | null }) {
  const [reply, setReply] = useState<DeviceReply | null>(null);
  const [checked, setChecked] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const url = `/api/device/${group.id}${sampleId ? `?sample=${sampleId}` : ""}`;

  useEffect(() => {
    if (!trigger) return;
    let live = true;
    fetch(url)
      .then((r) => r.json())
      .then((data: DeviceReply) => {
        if (!live) return;
        setReply(data);
        setChecked(new Date().toLocaleTimeString("en-GB"));
        if (!mutedRef.current) buzz(data.buzz ?? []);
      })
      .catch(() => live && setReply({ level: "none", led: "#000", buzz: [], headline: null, error: "Device endpoint unreachable" }));
    return () => {
      live = false;
    };
  }, [trigger, url]);

  const on = reply && reply.level !== "none";
  const flashing = reply?.level === "bahaya" || reply?.level === "amaran";

  return (
    <section className="rounded-2xl border border-line bg-panel p-4" aria-labelledby="siren-title">
      <div className="flex items-start gap-4">
        {/* The device: a lens LED over a speaker grille. */}
        <div className="flex w-24 shrink-0 flex-col items-center gap-2 rounded-xl border border-[#2a2a2a] bg-[#1b1b1b] px-3 pb-3 pt-3.5">
          <span
            className={`size-12 rounded-full border-4 border-[#0d0d0d] ${on && flashing ? "blink" : ""}`}
            style={{
              background: on ? reply!.led : "#3a3a3a",
              boxShadow: on ? `0 0 24px 6px ${reply!.led}88` : "inset 0 2px 6px #0008",
            }}
            aria-hidden
          />
          <span className="grid grid-cols-5 gap-1" aria-hidden>
            {Array.from({ length: 15 }, (_, i) => (
              <span key={i} className="size-1 rounded-full bg-[#444]" />
            ))}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h3 id="siren-title" className="text-[15px] font-bold leading-tight">
            Dorm siren box
          </h3>
          <p className="text-[12.5px] leading-snug text-mist-dim">
            In the {group.name} dormitory. Wakes workers whose phones are on silent.
          </p>
          <div className="mt-2.5 min-h-[44px]" aria-live="polite">
            {!reply && <p className="text-[13px] text-mist-dim">Waiting. It checks Faham every 60 seconds.</p>}
            {reply?.error && <p className="text-[13px] text-bahaya">{reply.error}</p>}
            {reply && !reply.error && reply.level === "none" && (
              <p className="text-[13px]">No warning for {group.district}. The box stays dark.</p>
            )}
            {reply && reply.headline && (
              <>
                <p lang={group.lang} className="text-[15px] font-bold leading-snug" style={{ color: reply.led }}>
                  {reply.headline}
                </p>
                <p className="text-[12px] text-mist-dim">
                  {reply.headline_en}. Light and {reply.buzz.length ? `${Math.ceil(reply.buzz.length / 2)} buzzes` : "no buzz"}.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-2.5 text-[12px] text-mist-dim">
        <span>{checked ? `Last check ${checked}` : "Not checked yet"}</span>
        <a href={url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-mist">
          See what the device receives
        </a>
        <button type="button" onClick={() => setMuted((m) => !m)} className="ms-auto underline underline-offset-2 hover:text-mist">
          {muted ? "Turn buzzer sound on" : "Mute buzzer sound"}
        </button>
      </div>
    </section>
  );
}
