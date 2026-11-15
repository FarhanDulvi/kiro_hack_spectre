import Link from "next/link";
import { LiveCount } from "@/components/LiveCount";

const TILES = [
  { word: "Waspada", en: "Alert", line: "সতর্ক থাকুন", color: "var(--color-waspada)", ink: "#2b2100", pos: "left-[12%] top-[5%]" },
  { word: "Amaran", en: "Warning", line: "मौसम चेतावनी", color: "var(--color-amaran)", ink: "#2e1300", pos: "left-[39%] top-[32%]" },
  { word: "Bahaya", en: "Danger", line: "বন্যার বিপদ", color: "var(--color-bahaya)", ink: "#ffffff", pos: "left-[12%] top-[59%]" },
];

const BANDS = [
  { text: "Detect · Verify · Respond", cls: "marquee" },
  { text: "Six worker languages · Sirens in dormitories · Payouts on a public ledger", cls: "marquee-rev" },
  { text: "No official source, no alert", cls: "marquee" },
];

const STEPS = [
  {
    tag: "01. Detect",
    tagColor: "#4f6bed",
    title: "Official signals",
    body: "Live MetMalaysia warnings from data.gov.my, plus river-level sensors. Perisai reads each one and pulls out the hazard, severity and the exact districts named.",
  },
  {
    tag: "02. Verify",
    tagColor: "#8b5cf6",
    title: "Independent sources agree",
    body: "A confidence score from the official warning, the river sensor and nearby weather warnings. A sensor on its own is held for a person: Perisai never sends without an official source.",
  },
  {
    tag: "03. Respond",
    tagColor: "#2e9e6a",
    title: "Warn, wake, pay, record",
    body: "Faham writes the warning in Bengali, Nepali, Burmese, Indonesian, Hindi and Urdu for the groups inside the area. Dorm siren boxes light up. Relief payouts go out over DuitNow. Everything lands on a tamper-evident ledger.",
  },
];

const STATS = [
  { value: "3,682", label: "Flood hotspots on alert", note: "NADMA, northeast monsoon 2026", from: "#ffd6d6", to: "#fff4f1" },
  { value: "6", label: "Worker languages", note: "Reviewed phrases, exact English meaning", from: "#e2dcff", to: "#f7f5ff" },
  { value: "19 Nov", label: "National phone alert test", note: "Fixes delivery, not language", from: "#cdf3f7", to: "#f1fdff" },
  { value: "0", label: "Alerts without an official source", note: "The rule that never bends", from: "#c9f1dc", to: "#f1fdf6" },
];

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="dots relative -mt-[60px] overflow-hidden pt-[60px]">
        <div className="mx-auto grid max-w-[1320px] items-center gap-10 px-6 py-16 md:grid-cols-[1fr_1.15fr] md:py-24">
          <div className="relative mx-auto aspect-square w-full max-w-[460px]" aria-hidden>
            {TILES.map((t) => (
              <div
                key={t.word}
                className={`absolute ${t.pos} grid aspect-square w-[36%] rotate-45 place-items-center rounded-[14px] shadow-[0_24px_50px_-24px_rgba(0,0,0,0.45)]`}
                style={{ background: t.color, color: t.ink }}
              >
                <div className="-rotate-45 text-center">
                  <p className="font-serif text-[34px] italic leading-none">{t.word}</p>
                  <p className="mt-1 text-[12px] font-medium opacity-80">{t.en}</p>
                  <p className="mt-2 text-[15px] font-bold">{t.line}</p>
                </div>
              </div>
            ))}
          </div>
          <div>
            <p className="inline-block border-b-2 border-signal pb-1 text-[13px] font-medium uppercase tracking-[0.5em]">Introducing Perisai</p>
            <h1 className="mt-6 font-serif text-[46px] leading-[1.02] tracking-tight sm:text-[64px]">
              Autonomous disaster <em>response</em>, built for Malaysia&rsquo;s monsoon
            </h1>
            <p className="mt-6 max-w-[54ch] text-[17px] leading-relaxed text-mist-dim">
              Perisai, Malay for shield, turns official warnings into action: messages in the languages migrant workers actually read, sirens in
              their dormitories, and relief payouts anyone can audit.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/dashboard" className="rounded-xl bg-ink px-6 py-3.5 text-[16px] font-medium text-white hover:bg-black">
                Open the live dashboard
              </Link>
              <Link href="/dashboard?demo=1" className="rounded-xl border-2 border-ink px-6 py-3 text-[16px] font-medium hover:bg-white">
                Watch the 60-second demo
              </Link>
              <p className="w-full text-[14px] text-mist-dim">
                <LiveCount />
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Scrolling bands */}
      <section aria-label="Perisai in brief" className="space-y-1.5 overflow-hidden bg-night py-10">
        {BANDS.map((b) => (
          <div key={b.text} className="overflow-hidden bg-ink py-3 text-white">
            <div className={`${b.cls} flex w-max gap-12 whitespace-nowrap text-[24px] font-medium uppercase tracking-wide`}>
              {Array.from({ length: 8 }, (_, i) => (
                <span key={i}>{b.text}</span>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* The problem */}
      <section className="mx-auto max-w-[1320px] px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div>
            <h2 className="font-serif text-[40px] leading-[1.05] tracking-tight sm:text-[52px]">
              The warning reaches the phone. The worker still can&rsquo;t read it.
            </h2>
            <p className="mt-5 max-w-[58ch] text-[16px] leading-relaxed text-mist-dim">
              Official warnings from MetMalaysia, JPS and NADMA go out in Malay and English. The people building our homes and running our factories
              read Bengali, Nepali, Burmese, Hindi and Urdu, and get their news from rumours in group chats. Human Rights Watch has called for emergency
              information in workers&rsquo; native languages. Perisai does that, automatically, for the groups inside the warned area only.
            </p>
          </div>
          <div className="rounded-3xl border border-line bg-panel p-6 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.4)]">
            <p className="text-[12px] font-medium text-mist-dim">Official, 11:30</p>
            <p className="mt-1 text-[15px] leading-relaxed">
              AMARAN BANJIR: Paras air Sungai Klang di Jambatan Kota, Klang telah melepasi paras BAHAYA…
            </p>
            <div className="my-4 h-px bg-line" />
            <p className="text-[12px] font-medium text-mist-dim">What a Bangladeshi worker in Klang receives, 11:30</p>
            <p lang="bn" className="mt-1 text-[18px] font-bold">বন্যার বিপদ</p>
            <p lang="bn" className="text-[15px] leading-relaxed">উঁচু জায়গায় বা নিকটতম আশ্রয়কেন্দ্রে (PPS) চলে যান।</p>
            <p className="mt-1 text-[13px] italic text-mist-dim">Flood danger. Move to higher ground or the nearest relief centre (PPS).</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-[1320px] scroll-mt-24 px-6 py-16">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <h2 className="font-serif text-[40px] leading-none tracking-tight sm:text-[52px]">How Perisai works</h2>
          <p className="max-w-[46ch] text-[15px] text-mist-dim">Three steps, run in order every time a signal comes in. Each one can stop the next.</p>
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.tag} className="rounded-2xl border border-line bg-panel p-6">
              <span className="inline-block rounded px-2 py-1 text-[12px] font-bold uppercase tracking-wide text-white" style={{ background: s.tagColor }}>
                {s.tag}
              </span>
              <h3 className="mt-4 text-[22px] font-bold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-mist-dim">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Numbers */}
      <section className="mx-auto max-w-[1320px] px-6 pb-20 pt-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-line p-6" style={{ background: `linear-gradient(160deg, ${s.from}, ${s.to})` }}>
              <p className="text-[14px] font-medium">{s.label}</p>
              <p className="mt-1 text-[44px] font-bold leading-none tracking-tight">{s.value}</p>
              <p className="mt-3 text-[13px] text-mist-dim">{s.note}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-ink p-8 text-white sm:p-10">
          <p className="max-w-[30ch] font-serif text-[34px] leading-tight">Run a real MetMalaysia warning through Perisai.</p>
          <Link href="/dashboard" className="rounded-xl bg-white px-6 py-3.5 text-[16px] font-medium text-ink hover:bg-night">
            Open the live dashboard
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-end justify-between gap-6 px-6 py-10">
          <p className="font-serif text-[88px] leading-none tracking-tight sm:text-[140px]">Perisai</p>
          <p className="max-w-[44ch] text-[13px] leading-relaxed text-mist-dim">
            Built on 15 November 2026 at the STC Mini Hackathon. Live data: MetMalaysia via data.gov.my. Samples and worker groups are fictional and
            labelled. Payouts are simulated.
          </p>
        </div>
      </footer>
    </main>
  );
}
