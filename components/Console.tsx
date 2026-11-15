"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GROUPS, SIREN_GROUP_ID } from "@/data/groups";
import { LANGS } from "@/data/languages";
import { SAMPLES, SENSOR_EVENTS } from "@/data/samples";
import { areasText, checkMessage, compose, targetGroups } from "@/lib/compose";
import { displayState, extractFacts, fmtTime } from "@/lib/extract";
import { append, firstBroken, simRef, type LedgerEntry } from "@/lib/ledger";
import { SEVERITY } from "@/lib/severity";
import type { Facts, Hazard, Lang, OfficialAlert } from "@/lib/types";
import { verify, type Verdict } from "@/lib/verify";
import { AGENTS, runPipeline, type Agent, type AgentMessage, type PipelineResult } from "@/lib/agents";
import { readingToAlert, type SensorReading } from "@/lib/sensors";
import { AidPanel, LedgerPanel } from "./Ledger";
import { MapView } from "./MapView";
import { RealMap } from "./RealMap";
import { MessageBody, Phone, VoiceNote } from "./Phone";
import { SirenBox } from "./SirenBox";

const HAZARD_LABEL: Record<Hazard, string> = {
  flood: "Flood",
  evacuation: "Relief centre open",
  all_clear: "Danger eased",
  strong_wind_sea: "Strong wind at sea",
  thunderstorm: "Thunderstorm",
  heavy_rain: "Heavy rain",
  other: "Other",
};

const STEPS = [
  { name: "Detect", does: "Read the warning and pick out the facts" },
  { name: "Verify", does: "Check independent sources agree" },
  { name: "Warn", does: "Write it in 6 languages, send to groups in the area" },
  { name: "Log", does: "Record it on the public ledger" },
];
const STEP_MS = 700;

type Feed = { live: OfficialAlert[]; liveOk: boolean | null };
type Run = { id: string; step: number; held?: boolean; result: PipelineResult };
type LogLine = AgentMessage & { time: string };

const now = () => new Date().toLocaleTimeString("en-GB");

/** The guided demo: one click tells the whole story, step by step. */
type DemoStep = { caption: string; wait: number; select?: string; act?: "run" | "pay" | "tamper" | "check"; scroll?: string };
const VERIFY_CARD = "section[aria-label=Verification]";
const DEMO: DemoStep[] = [
  { caption: "A river sensor on Sungai Kelantan crosses warning level. There is no official warning yet.", select: "sensor-kelantan", wait: 1800 },
  { caption: "Perisai runs it. The Auditor holds it: no official source, no alert.", act: "run", wait: 3200, scroll: VERIFY_CARD },
  { caption: "Now an official JPS flood warning for Klang arrives.", select: "sample-flood", wait: 1800 },
  { caption: "The Auditor scores it 100 out of 100: JPS, the river sensor and a live MetMalaysia warning all agree.", act: "run", wait: 3600, scroll: VERIFY_CARD },
  { caption: "The Herald sends it in Bengali, Nepali, Burmese and Urdu, only to the 4 groups in Klang and Shah Alam. The dorm siren goes off.", wait: 4500, scroll: "#phones-title" },
  { caption: "The Treasurer pays RM200 per worker over DuitNow, once per event. This part is simulated.", act: "pay", wait: 3200, scroll: "#aid-title" },
  { caption: "Someone secretly edits an old payout in the ledger…", act: "tamper", wait: 2200, scroll: "#ledger-title" },
  { caption: "…and the ledger catches it straight away.", act: "check", wait: 3800, scroll: "#ledger-title" },
  { caption: "That is Perisai. Pick a live MetMalaysia warning on the left to try it yourself.", wait: 0 },
];

/** What the ESP32 river sensor would post; the dashboard can send one for the demo. */
async function postTestReading() {
  const reading = 4.9 + Math.round(Math.random() * 60) / 100; // 4.90 to 5.50 m
  await fetch("/api/sensor", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-device-key": "perisai-demo" },
    body: JSON.stringify({
      deviceId: "KLG-01",
      river: "Sungai Klang",
      station: "Jambatan Kota",
      state: "Selangor",
      district: "Klang",
      reading,
      waspada: 4.5,
      amaran: 4.8,
      bahaya: 5.1,
    }),
  });
}

export function Console() {
  const [feed, setFeed] = useState<Feed>({ live: [], liveOk: null });
  const [selectedId, setSelectedId] = useState("sample-flood");
  const [run, setRun] = useState<Run | null>(null);
  const [sent, setSent] = useState<Record<string, number>>({});
  const [paid, setPaid] = useState<Record<string, true>>({});
  const [viewLang, setViewLang] = useState<Lang>("bn");
  const [showEnglish, setShowEnglish] = useState(false);
  const [sirenTrigger, setSirenTrigger] = useState(0);
  const [chain, setChain] = useState<LedgerEntry[]>([]);
  const [ledgerStatus, setLedgerStatus] = useState<string | null>(null);
  const [original, setOriginal] = useState<LedgerEntry[] | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [log, setLog] = useState<LogLine[]>([]);
  const [warnedKeys, setWarnedKeys] = useState<Set<string>>(new Set());
  const [posting, setPosting] = useState(false);
  const chainRef = useRef<LedgerEntry[]>([]);
  const [demo, setDemo] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/official")
      .then((r) => r.json())
      .then((d: { live: OfficialAlert[]; liveOk: boolean }) => setFeed({ live: d.live, liveOk: d.liveOk }))
      .catch(() => setFeed({ live: [], liveOk: false }));
  }, []);

  // Watchtower: poll the river sensors every 10 seconds.
  const loadReadings = () =>
    fetch("/api/sensor")
      .then((r) => r.json())
      .then((d: { readings: SensorReading[] }) => setReadings(d.readings))
      .catch(() => {});
  useEffect(() => {
    loadReadings();
    const t = setInterval(loadReadings, 10_000);
    return () => clearInterval(t);
  }, []);

  const deviceAlerts = useMemo(() => readings.map(readingToAlert), [readings]);
  const all = useMemo(() => [...feed.live, ...deviceAlerts, ...SENSOR_EVENTS, ...SAMPLES], [feed.live, deviceAlerts]);
  const alert = all.find((a) => a.id === selectedId) ?? SAMPLES[0];
  const facts = useMemo(() => extractFacts(alert), [alert]);
  const verdict = useMemo(() => verify(alert, facts, all), [alert, facts, all]);
  const targets = useMemo(() => targetGroups(facts, GROUPS), [facts]);
  const addLog = (step: number, result: PipelineResult) =>
    setLog((l) => [...l, ...result.messages.filter((m) => m.step === step).map((m) => ({ ...m, time: now() }))]);
  const mine = run?.id === alert.id ? run : null;
  const step = mine?.step ?? 0;
  const held = !!mine?.held;
  const warned = step >= 3 && !held;
  const done = step >= STEPS.length;
  const reached = useMemo(() => new Set(warned ? targets.map((g) => g.id) : []), [warned, targets]);
  const preview = useMemo(() => compose(facts, viewLang, targets.find((g) => g.lang === viewLang)), [facts, viewLang, targets]);
  const checks = useMemo(() => checkMessage(facts, preview), [facts, preview]);
  const sentAt = fmtTime(alert.issued).split(" ")[1];

  const record = (entry: Pick<LedgerEntry, "kind" | "summary" | "amountRm" | "ref">) =>
    append(chainRef.current, entry).then((c) => {
      chainRef.current = c;
      setChain(c);
      setLedgerStatus(null);
    });

  // Walk the protocol one step at a time so people can follow it.
  useEffect(() => {
    if (!run || run.held || run.step >= STEPS.length) return;
    const t = setTimeout(() => {
      const { result } = run;
      const next = run.step + 1;
      addLog(next, result);
      if (next === 2 && !result.verdict.approved) {
        setRun({ ...run, step: 2, held: true });
        return;
      }
      setRun({ ...run, step: next });
      if (next === 3) {
        setSirenTrigger((n) => n + 1);
        setWarnedKeys((w) => new Set([...w, ...result.fresh.map((g) => `${run.id}:${g.id}`)]));
      }
      if (next === STEPS.length && result.fresh.length) {
        const a = all.find((x) => x.id === run.id);
        const workers = result.fresh.reduce((n, g) => n + g.members, 0);
        setSent((s) => ({ ...s, [run.id]: (s[run.id] ?? 0) + workers }));
        record({
          kind: "warning",
          summary: `${a?.titleEn ?? run.id} (${a?.source}, ${fmtTime(a?.issued ?? "")}) sent to ${result.fresh.length} groups, ${workers} workers`,
          amountRm: 0,
          ref: run.id,
        });
      }
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [run, all]);

  const select = (id: string) => {
    setSelectedId(id);
    setShowEnglish(false);
  };
  const send = () => {
    const result = runPipeline(alert, all, warnedKeys);
    setRun({ id: alert.id, step: 1, result });
    addLog(1, result);
    const first = result.targets[0];
    if (first) setViewLang(first.lang);
  };
  const testReading = async () => {
    setPosting(true);
    await postTestReading();
    await loadReadings();
    setPosting(false);
  };
  const pay = async (perWorker: number) => {
    setPaid((p) => ({ ...p, [alert.id]: true }));
    const total = targets.reduce((n, g) => n + g.members * perWorker, 0);
    setLog((l) => [
      ...l,
      {
        step: 4,
        from: "Treasurer",
        to: "DuitNow (simulated)",
        kind: "Payout",
        ok: true,
        time: now(),
        text: `${targets.length} payouts, RM${total.toLocaleString("en-MY")} total, RM${perWorker} per worker. Event locked against a second payout.`,
      },
    ]);
    for (const g of targets) {
      await record({
        kind: "payout",
        summary: `${g.name}: ${g.members} workers × RM${perWorker}, for ${alert.titleEn.toLowerCase()} ${fmtTime(alert.issued)}`,
        amountRm: g.members * perWorker,
        ref: simRef(`${alert.id}-${g.id}-${perWorker}`),
      });
    }
  };
  const checkLedger = async () => {
    const broken = await firstBroken(chain);
    setLedgerStatus(
      broken === null
        ? `All ${chain.length} entries intact. Nothing has been changed since it was recorded.`
        : `Entry #${broken} was changed after it was recorded. Its fingerprint no longer matches, so every entry after it is suspect too.`,
    );
  };
  const tamper = () => {
    if (original) {
      chainRef.current = original;
      setChain(original);
      setOriginal(null);
      setLedgerStatus(null);
      return;
    }
    const target = chain.find((e) => e.kind === "payout") ?? chain[0];
    setOriginal(chain);
    const edited = chain.map((e) =>
      e.n === target.n ? { ...e, amountRm: e.amountRm + 50_000, summary: e.summary + " (edited)" } : e,
    );
    chainRef.current = edited;
    setChain(edited);
    setLedgerStatus(null);
  };

  const startDemo = () => {
    setPaid({});
    setWarnedKeys(new Set());
    chainRef.current = [];
    setChain([]);
    setOriginal(null);
    setLedgerStatus(null);
    setLog([]);
    setSent({});
    setRun(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setDemo(0);
  };

  // Each demo step runs after the previous one has rendered, so it sees fresh state.
  useEffect(() => {
    if (demo === null) return;
    const s = DEMO[demo];
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(
      setTimeout(() => {
        if (s.select) select(s.select);
        if (s.act === "run") send();
        if (s.act === "pay") void pay(200);
        if (s.act === "tamper") tamper();
        if (s.act === "check") void checkLedger();
      }, 50),
    );
    if (s.scroll) {
      timers.push(
        setTimeout(() => document.querySelector(s.scroll!)?.scrollIntoView({ behavior: "smooth", block: "center" }), s.act === "run" ? 1600 : 300),
      );
    }
    if (demo < DEMO.length - 1) timers.push(setTimeout(() => setDemo(demo + 1), s.wait));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  // /dashboard?demo=1 starts the demo on arrival (used by the landing page).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("demo") !== "1") return;
    const t = setTimeout(startDemo, 1500);
    return () => clearTimeout(t);
  }, []);

  const totalWorkers = Object.values(sent).reduce((a, b) => a + b, 0);
  const sirenGroup = GROUPS.find((g) => g.id === SIREN_GROUP_ID)!;
  const aidEligible = warned && targets.length > 0 && (facts.hazard === "flood" || facts.hazard === "evacuation");
  const slip = (a: OfficialAlert) => (
    <AlertSlip
      key={a.id}
      alert={a}
      selected={a.id === alert.id}
      onSelect={select}
      onSend={send}
      sentWorkers={sent[a.id]}
      running={step > 0 && !done && !held && a.id === alert.id}
    />
  );

  return (
    <div className="mx-auto max-w-[1520px] px-4 pb-12 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4 pb-6 pt-10">
        <div>
          <h1 className="font-serif text-[52px] leading-[0.95] tracking-tight">Perisai dashboard</h1>
          <p className="mt-2 text-[15px] text-mist-dim">Detect, verify and respond to official warnings during Malaysia&rsquo;s 2026/27 monsoon.</p>
          <button
            type="button"
            onClick={startDemo}
            disabled={demo !== null && demo < DEMO.length - 1}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-white hover:bg-black disabled:opacity-60"
          >
            <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden>
              <path d="M1 0.5 L9.5 5 L1 9.5 Z" fill="currentColor" />
            </svg>
            {demo !== null && demo < DEMO.length - 1 ? "Demo playing…" : "Play the 30-second demo"}
          </button>
        </div>
        <div className="flex gap-3" aria-live="polite">
          <Stat label="Warnings sent" value={String(Object.keys(sent).length)} />
          <Stat label="Workers reached" value={totalWorkers.toLocaleString()} />
          <Stat label="Ledger entries" value={String(chain.length)} />
        </div>
      </header>

      <AgentStatus
        log={log}
        active={held ? "Auditor" : step === 1 ? "Watchtower" : step === 2 ? "Auditor" : step === 3 || (step === 4 && !done) ? "Herald" : null}
        held={held}
        watchNote={`${feed.live.length} live warnings, ${readings.length} river ${readings.length === 1 ? "sensor" : "sensors"}`}
      />

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)_minmax(0,450px)] 2xl:grid-cols-[290px_minmax(0,1fr)_minmax(0,520px)]">
        {/* Detect: incoming signals */}
        <aside aria-labelledby="feed-title" className="space-y-5">
          <h2 id="feed-title" className="sr-only">Incoming signals</h2>
          <FeedSection title="Live from MetMalaysia" note={liveNote(feed)}>
            {feed.live.map(slip)}
          </FeedSection>
          <FeedSection title="River sensors" note="ESP32 water-level sensors post here every minute. A reading alone is never enough to warn.">
            {deviceAlerts.map(slip)}
            {SENSOR_EVENTS.map(slip)}
            <button
              type="button"
              onClick={testReading}
              disabled={posting}
              className="w-full rounded-xl border border-dashed border-ink/30 px-3 py-2 text-[13px] font-medium hover:border-ink/60 disabled:opacity-50"
            >
              {posting ? "Posting…" : "Send a test reading as sensor KLG-01"}
            </button>
          </FeedSection>
          <FeedSection title="Samples" note="Written in the style of JPS and NADMA alerts, for the demo.">
            {SAMPLES.map(slip)}
          </FeedSection>
        </aside>

        <main className="min-w-0 space-y-5">
          <ol className="grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Perisai protocol steps">
            {STEPS.map((s, i) => {
              const n = i + 1;
              const state =
                held && n === 2 ? "held" : held && n > 2 ? "waiting" : step > n || done ? "done" : step === n ? "doing" : "waiting";
              return (
                <li
                  key={s.name}
                  className={`rounded-xl border bg-panel px-3 py-2.5 ${state === "waiting" ? "border-line text-mist-dim" : state === "held" ? "border-amaran" : "border-ink/25"}`}
                >
                  <p className="flex items-center gap-2 text-[14px] font-bold">
                    <StepMark state={state} n={n} />
                    {s.name}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug text-mist-dim">{s.does}</p>
                  {state !== "waiting" && <StepDetail i={i} facts={facts} verdict={verdict} reachedCount={targets.length} held={held} />}
                </li>
              );
            })}
          </ol>

          {step >= 2 && <VerifyCard verdict={verdict} held={held} />}
          <AgentLog log={log} alertId={alert.id} />

          <section aria-labelledby="map-title" className="rounded-2xl border border-line bg-panel p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-1 pb-1">
              <h2 id="map-title" className="text-[15px] font-bold">Who gets this warning</h2>
              <p className="text-[12.5px] text-mist-dim">
                {held
                  ? "Nothing sent: no official source yet"
                  : warned
                    ? targets.length
                      ? `${targets.length} of ${GROUPS.length} groups, ${targets.reduce((n, g) => n + g.members, 0)} workers`
                      : `0 of ${GROUPS.length} groups: ${facts.seaStates.length ? "this warning is for the sea" : "none in the warned area"}`
                    : "Groups light up once the warning is sent"}
              </p>
            </div>
            <RealMap
              facts={step >= 1 ? facts : null}
              groups={GROUPS}
              reached={reached}
              gauge={step >= 1 ? (alert.gauge ?? null) : null}
              fallback={<MapView facts={step >= 1 ? facts : null} groups={GROUPS} reached={reached} />}
            />
          </section>

          <section aria-labelledby="compare-title" className="grid overflow-hidden rounded-2xl border border-line md:grid-cols-2">
            <h2 id="compare-title" className="sr-only">Official text and what workers receive</h2>
            <div className="bg-paper p-4 text-ink">
              <p className="text-[12px] font-bold text-ink/55">{alert.kind === "sensor" ? "Sensor reading, in Malay" : "Official warning, in Malay"}</p>
              <p className="mt-1 text-[15px] font-bold">{alert.titleBm}</p>
              <p className="mt-2 max-h-56 overflow-y-auto pe-1 text-[13.5px] leading-relaxed">{alert.textBm}</p>
              <p className="mt-3 text-[12px] text-ink/60">
                {alert.source}, {fmtTime(alert.issued)}
                {alert.kind !== "live" && ". Sample for the demo"}
              </p>
            </div>
            <div className="bg-chat p-4 text-ink">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12px] font-bold text-ink/55">Faham: what workers receive</p>
                <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-ink/70">
                  <input type="checkbox" checked={showEnglish} onChange={(e) => setShowEnglish(e.target.checked)} className="accent-ink" />
                  Show the English meaning
                </label>
              </div>
              <div role="tablist" aria-label="Language" className="mt-2 flex flex-wrap gap-1">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    role="tab"
                    aria-selected={viewLang === l.code}
                    onClick={() => setViewLang(l.code)}
                    title={l.name}
                    className={`rounded-full px-2.5 py-1 text-[13px] ${viewLang === l.code ? "bg-ink text-white" : "bg-white/70 text-ink hover:bg-white"}`}
                  >
                    {l.native}
                  </button>
                ))}
              </div>
              {warned ? (
                <div className="mt-3 space-y-2">
                  <div className="rounded-xl bg-white p-3">
                    <MessageBody msg={preview} severity={facts.severity} showEnglish={showEnglish} />
                  </div>
                  <VoiceNote msg={preview} />
                </div>
              ) : (
                <p className="mt-6 text-[13.5px] text-ink/60">
                  {held ? "Not written: Perisai waits for an official source." : "Press Run Perisai to write this warning in 6 languages."}
                </p>
              )}
            </div>
            {warned && (
              <ul className="grid gap-x-4 gap-y-1.5 border-t border-line bg-panel px-4 py-3 text-[12.5px] sm:grid-cols-2 md:col-span-2" aria-label="Checks on this message">
                {checks.map((c) => (
                  <li key={c.label} className="flex items-start gap-2">
                    <Tick ok={c.ok} />
                    <span>
                      <strong>{c.label}</strong> <span className="text-mist-dim">{c.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>

        {/* Respond: phones, siren, aid and the ledger */}
        <section aria-labelledby="phones-title" className="min-w-0 space-y-4 lg:col-span-2 xl:col-span-1">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="phones-title" className="text-[15px] font-bold">Worker group chats</h2>
            <p className="text-[12.5px] text-mist-dim">Fictional demo groups</p>
          </div>
          {!warned ? (
            <div className="grid min-h-[200px] place-items-center rounded-2xl border border-dashed border-line p-6 text-center text-[14px] text-mist-dim">
              {held
                ? "Held. No message goes out until JPS or MetMalaysia confirms."
                : step > 0
                  ? "Verifying…"
                  : "Nothing sent yet. Pick a signal and press Run Perisai."}
            </div>
          ) : targets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-6 text-[14px] leading-relaxed">
              <p className="font-bold">No worker groups are in the warned area.</p>
              <p className="mt-1 text-mist-dim">
                {facts.seaStates.length
                  ? `This warning is for the sea near ${facts.seaStates.map(displayState).join(", ")}, so no land group gets it. Sending it anyway would teach workers to ignore alerts.`
                  : "Perisai only messages groups inside the areas the official warning names."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {targets.map((g, i) => (
                <Phone key={`${alert.id}-${g.id}`} group={g} msg={compose(facts, g.lang, g)} severity={facts.severity} delay={i * 140} time={sentAt} />
              ))}
            </div>
          )}
          <SirenBox group={sirenGroup} trigger={sirenTrigger} sampleId={alert.kind === "sample" ? alert.id : null} />
          <AidPanel
            groups={targets}
            eligible={aidEligible}
            paid={!!paid[alert.id]}
            onPay={pay}
            ineligibleReason={
              !warned
                ? "Payouts open after a flood or evacuation warning has been sent."
                : "Payouts are for flood and evacuation events with worker groups in the area."
            }
          />
          <LedgerPanel chain={chain} onCheck={checkLedger} onTamper={tamper} status={ledgerStatus} tampered={!!original} />
        </section>
      </div>

      {demo !== null && (
        <div role="status" aria-live="polite" className="fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
          <div className="flex max-w-[780px] items-center gap-4 rounded-2xl bg-ink px-5 py-3.5 text-white shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)]">
            <span className="shrink-0 text-[12px] tabular-nums text-white/60">
              {demo + 1} of {DEMO.length}
            </span>
            <p className="text-[15px] leading-snug">{DEMO[demo].caption}</p>
            <button type="button" onClick={() => setDemo(null)} className="shrink-0 rounded-full border border-white/30 px-3 py-1 text-[13px] hover:border-white/70">
              {demo === DEMO.length - 1 ? "Close" : "Stop"}
            </button>
          </div>
        </div>
      )}

      <footer className="mt-10 border-t border-line pt-4 text-[12.5px] leading-relaxed text-mist-dim">
        <p>
          Perisai never writes its own warnings. Every message relays an official source, is built only from reviewed phrases, and is labelled as machine
          translated. Payouts are simulated.
        </p>
        <p className="mt-1">
          Phrasebook drafted with AI and awaiting review by native speakers. Live warnings: MetMalaysia via data.gov.my. State boundaries: DOSM open data.
        </p>
      </footer>
    </div>
  );
}

function AgentStatus({ log, active, held, watchNote }: { log: LogLine[]; active: Agent | null; held: boolean; watchNote: string }) {
  return (
    <section aria-label="System status" className="mb-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
      {AGENTS.map((a) => {
        const mine = log.filter((l) => l.from === a.name);
        const last = mine.at(-1);
        const isActive = active === a.name;
        const isHeld = held && a.name === "Auditor";
        const dot = isHeld ? "bg-amaran" : isActive ? "bg-signal animate-pulse" : "bg-normal";
        const state = isHeld ? "Holding for review" : isActive ? "Working" : "Ready";
        return (
          <div key={a.name} className="rounded-xl border border-line bg-panel px-3.5 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[14px] font-bold">{a.name}</p>
              <p className="flex items-center gap-1.5 text-[12px] font-medium">
                <span className={`size-2 rounded-full ${dot}`} aria-hidden />
                {state}
              </p>
            </div>
            <p className="mt-0.5 text-[12px] leading-snug text-mist-dim">{a.name === "Watchtower" ? `${a.job}. ${watchNote}` : a.job}</p>
            <p className="mt-1.5 text-[11.5px] tabular-nums text-mist-dim">
              {mine.length} {mine.length === 1 ? "message" : "messages"}
              {last && `, last at ${last.time}`}
            </p>
          </div>
        );
      })}
    </section>
  );
}

function AgentLog({ log, alertId }: { log: LogLine[]; alertId: string }) {
  return (
    <section aria-labelledby="log-title" className="overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#141414] text-[#e8e4db]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-3">
        <h2 id="log-title" className="text-[15px] font-bold">Agent log</h2>
        <a href={`/api/pipeline/${encodeURIComponent(alertId)}`} target="_blank" rel="noreferrer" className="text-[12px] text-[#9a958b] underline underline-offset-2 hover:text-white">
          See this run as JSON
        </a>
      </div>
      <ol className="max-h-56 space-y-1 overflow-y-auto px-4 pb-3 pt-2 font-mono text-[11.5px] leading-relaxed" aria-live="polite">
        {log.length === 0 && <li className="text-[#9a958b]">Waiting for a signal. Agents hand each event to the next one here.</li>}
        {log
          .slice()
          .reverse()
          .map((l, i) => (
            <li key={`${l.time}-${i}`}>
              <span className="text-[#9a958b]">{l.time}</span>{" "}
              <span className={l.ok ? "text-[#7bd88f]" : "text-[#f2b632]"}>{l.from}</span>
              <span className="text-[#9a958b]"> to {l.to} </span>
              <span className="text-white">{l.kind}</span>
              <span className="font-sans text-[12.5px] text-[#e8e4db]"> {l.text}</span>
            </li>
          ))}
      </ol>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[120px] rounded-xl border border-line bg-panel px-4 py-2.5">
      <p className="text-[12px] text-mist-dim">{label}</p>
      <p className="text-[24px] font-bold tabular-nums leading-tight">{value}</p>
    </div>
  );
}

function Tick({ ok }: { ok: boolean }) {
  return (
    <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white ${ok ? "bg-normal" : "bg-bahaya"}`} aria-hidden>
      {ok ? "✓" : "!"}
    </span>
  );
}

function VerifyCard({ verdict, held }: { verdict: Verdict; held: boolean }) {
  return (
    <section aria-label="Verification" className={`rounded-2xl border bg-panel p-4 ${held ? "border-amaran" : "border-line"}`}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-baseline gap-1">
          <span className="text-[40px] font-bold leading-none tabular-nums">{verdict.score}</span>
          <span className="text-[14px] text-mist-dim">/ 100 confidence</span>
        </div>
        <div className="h-2 min-w-[140px] flex-1 overflow-hidden rounded-full bg-deep">
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{ width: `${verdict.score}%`, background: verdict.approved ? "var(--color-normal)" : "var(--color-amaran)" }}
          />
        </div>
      </div>
      <p className={`mt-2 text-[14px] font-bold ${verdict.approved ? "" : "text-amaran"}`}>{verdict.reason}</p>
      <ul className="mt-2 grid gap-1.5 text-[12.5px] sm:grid-cols-3">
        {verdict.evidence.map((e) => (
          <li key={e.label} className="flex items-start gap-2">
            <Tick ok={e.ok} />
            <span>
              <strong>{e.label}</strong> <span className="text-mist-dim">+{e.points}. {e.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function liveNote(feed: Feed) {
  if (feed.liveOk === null) return "Checking the government feed…";
  if (!feed.liveOk) return "The government feed is not answering right now. The samples still work.";
  if (!feed.live.length) return "No active warnings right now.";
  return "Pulled from data.gov.my when this page opened.";
}

function FeedSection({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[14px] font-bold">{title}</h3>
      <p className="mb-2 text-[12.5px] leading-snug text-mist-dim">{note}</p>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function AlertSlip({
  alert,
  selected,
  onSelect,
  onSend,
  sentWorkers,
  running,
}: {
  alert: OfficialAlert;
  selected: boolean;
  onSelect: (id: string) => void;
  onSend: () => void;
  sentWorkers?: number;
  running: boolean;
}) {
  const facts = extractFacts(alert);
  const sev = SEVERITY[facts.severity];
  return (
    <div className={`relative overflow-hidden rounded-xl border bg-panel ${selected ? "border-ink/40 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.45)]" : "border-line hover:border-ink/25"}`}>
      <span className="absolute inset-y-0 start-0 w-1.5" style={{ background: sev.color }} aria-hidden />
      <button type="button" onClick={() => onSelect(alert.id)} aria-pressed={selected} className="block w-full py-2.5 pe-3 ps-4 text-start">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-[14px] font-bold leading-snug">{alert.titleBm}</span>
          <span className="shrink-0 rounded-full px-2 py-px text-[11px] font-bold" style={{ background: sev.color, color: sev.text }}>
            {sev.label}
          </span>
        </span>
        <span className="block text-[12.5px] text-mist-dim">
          {alert.titleEn}, {fmtTime(alert.issued)}
          {alert.validFrom && alert.validTo && (
            <>
              <br />
              Valid {fmtTime(alert.validFrom)} to {fmtTime(alert.validTo)}
            </>
          )}
        </span>
        <span className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-mist/80">{alert.textBm}</span>
      </button>
      {selected && (
        <div className="flex items-center gap-3 px-4 pb-3">
          <button
            type="button"
            onClick={onSend}
            disabled={running}
            className="rounded-full bg-ink px-4 py-2 text-[13.5px] font-medium text-white hover:bg-black disabled:opacity-60"
          >
            {running ? "Running…" : sentWorkers !== undefined ? "Run again" : "Run Perisai"}
          </button>
          {sentWorkers !== undefined && !running && (
            <span className="text-[12.5px] text-mist-dim">Sent to {sentWorkers.toLocaleString()} workers</span>
          )}
        </div>
      )}
    </div>
  );
}

function StepMark({ state, n }: { state: "waiting" | "doing" | "done" | "held"; n: number }) {
  if (state === "done")
    return <span className="grid size-5 shrink-0 place-items-center rounded-full bg-normal text-[11px] text-white" aria-label="done">✓</span>;
  if (state === "held")
    return <span className="grid size-5 shrink-0 place-items-center rounded-full bg-amaran text-[11px] font-bold text-white" aria-label="held">!</span>;
  if (state === "doing")
    return <span className="size-5 shrink-0 animate-spin rounded-full border-2 border-ink border-t-transparent motion-reduce:animate-none" aria-label="in progress" />;
  return <span className="grid size-5 shrink-0 place-items-center rounded-full border border-line text-[11px]">{n}</span>;
}

function StepDetail({ i, facts, verdict, reachedCount, held }: { i: number; facts: Facts; verdict: Verdict; reachedCount: number; held: boolean }) {
  const sev = SEVERITY[facts.severity];
  if (i === 0)
    return (
      <p className="mt-1.5 flex flex-wrap gap-1 text-[11.5px]">
        <span className="rounded-full bg-deep px-2 py-0.5">{HAZARD_LABEL[facts.hazard]}</span>
        <span className="rounded-full px-2 py-0.5 font-bold" style={{ background: sev.color, color: sev.text }}>
          {sev.label} ({sev.en})
        </span>
        <span className="rounded-full bg-deep px-2 py-0.5">
          {facts.seaStates.length ? `Sea: ${facts.seaStates.length} states` : areasText(facts).split(", ").slice(0, 2).join(", ") || "No area"}
        </span>
      </p>
    );
  if (i === 1)
    return <p className={`mt-1 text-[12px] font-bold ${held ? "text-amaran" : ""}`}>{held ? "Held for review" : `${verdict.score}/100, approved`}</p>;
  if (i === 2) return <p className="mt-1 text-[12px] font-bold">{reachedCount} of {GROUPS.length} groups</p>;
  return <p className="mt-1 text-[12px] font-bold">Recorded</p>;
}
