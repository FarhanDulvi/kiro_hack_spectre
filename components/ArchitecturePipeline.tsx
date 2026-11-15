"use client";

import { motion } from "framer-motion";

type Block = { id: string; label: string; title: string; body: string; href?: string };

const INPUTS: Block[] = [
  { id: "met", label: "Live", title: "MetMalaysia warnings", body: "The government's open weather-warning API at data.gov.my, read on every page load and by the Watchtower." },
  { id: "iot", label: "IoT", title: "River-level sensors", body: "ESP32 boards with an ultrasonic sensor above the river post water levels over WiFi every minute.", href: "/api/sensor" },
  { id: "jps", label: "Official", title: "JPS and NADMA notices", body: "River danger levels and relief-centre (PPS) openings, in the style these agencies publish." },
];

const AGENT_BLOCKS: Block[] = [
  { id: "watchtower", label: "Detect", title: "Watchtower", body: "Turns each signal into an event: hazard, severity on the JPS gauge bands, and the exact states and districts named." },
  { id: "auditor", label: "Verify", title: "Auditor", body: "Scores how many independent sources agree. A sensor reading on its own is held for a person: no official source, no alert." },
  { id: "herald", label: "Warn", title: "Herald (Faham)", body: "Builds the warning from reviewed phrases in six languages and sends it only to groups inside the warned districts, never twice." },
];

const OUTPUTS: Block[] = [
  { id: "chats", label: "Message", title: "Worker group chats", body: "Bengali, Nepali, Burmese, Indonesian, Hindi and Urdu, each with a voice note and the official source." },
  { id: "siren", label: "Wake", title: "Dorm siren boxes", body: "ESP32 boxes in dormitories light up and buzz for workers whose phones are on silent.", href: "/api/device/kilang-klang" },
  { id: "treasurer", label: "Pay", title: "Treasurer and ledger", body: "Simulated DuitNow relief payouts, once per event, written to a tamper-evident hash-chained ledger." },
];

function Zone({ tag, color, title, body, blocks, from, align }: {
  tag: string;
  color: string;
  title: string;
  body: string;
  blocks: Block[];
  from: number;
  align: "left" | "center" | "right";
}) {
  return (
    <div className="space-y-6">
      <div className={`mb-8 text-center ${align === "left" ? "lg:text-left" : align === "right" ? "lg:text-right" : ""}`}>
        <div className="mb-4 inline-block px-4 py-2 text-xs font-bold uppercase tracking-wider text-white" style={{ background: color }}>
          {tag}
        </div>
        <h3 className="mb-2 text-2xl font-bold text-black">{title}</h3>
        <p className="font-medium text-mist-dim">{body}</p>
      </div>
      {blocks.map((b, i) => (
        <motion.div
          key={b.id}
          initial={{ opacity: 0, x: from }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.1 }}
          className="group"
        >
          <div className="relative border-2 border-line bg-white p-6 transition-all duration-300 hover:shadow-lg">
            <div className="absolute left-0 top-0 h-full w-1 origin-top scale-y-0 transition-transform duration-300 group-hover:scale-y-100" style={{ background: color }} />
            <div className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color }}>
              {b.label}
            </div>
            <div className="mb-2 text-lg font-bold text-black">{b.title}</div>
            <div className="text-sm font-medium text-mist-dim">{b.body}</div>
            {b.href && (
              <a href={b.href} target="_blank" rel="noreferrer" className="mt-3 inline-block text-[13px] font-medium underline underline-offset-2">
                Open {b.href}
              </a>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function ArchitecturePipeline() {
  return (
    <section className="relative overflow-hidden px-4 py-20">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(rgba(0,0,0,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.6) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />
      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <div className="mb-6 inline-block bg-black px-6 py-3 text-sm font-bold uppercase tracking-wider text-white">System architecture</div>
          <h1 className="mb-6 font-serif text-5xl leading-tight text-black md:text-6xl">
            From an official warning to a worker&rsquo;s phone, <em>in seconds</em>
          </h1>
          <p className="mx-auto max-w-3xl text-xl font-medium text-mist-dim">
            Three kinds of input, four agents in a fixed order, three kinds of response. Every hand-off is logged and can be inspected.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-3">
          <Zone tag="01. Inputs" color="#4f6bed" title="Signals" body="Official feeds and sensors" blocks={INPUTS} from={-30} align="left" />
          <Zone tag="02. Agents" color="#8b5cf6" title="Detect, verify, warn" body="Each agent can stop the next" blocks={AGENT_BLOCKS} from={0} align="center" />
          <Zone tag="03. Response" color="#2e9e6a" title="Message, wake, pay" body="Only inside the warned area" blocks={OUTPUTS} from={30} align="right" />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mt-16">
          <div className="bg-black p-8 text-white md:p-12">
            <div className="grid gap-8 text-center md:grid-cols-3">
              <div>
                <div className="mb-2 text-4xl font-bold">4 agents</div>
                <div className="text-sm font-bold uppercase tracking-wider text-gray-300">Watchtower, Auditor, Herald, Treasurer</div>
              </div>
              <div>
                <div className="mb-2 text-4xl font-bold">6 languages</div>
                <div className="text-sm font-bold uppercase tracking-wider text-gray-300">Each phrase with an exact English meaning</div>
              </div>
              <div>
                <div className="mb-2 text-4xl font-bold">0</div>
                <div className="text-sm font-bold uppercase tracking-wider text-gray-300">Alerts without an official source</div>
              </div>
            </div>
            <div className="mt-8 border-t border-gray-700 pt-8 text-center">
              <p className="mx-auto max-w-4xl text-lg font-medium text-gray-300">
                Endpoints: <code>/api/official</code> (live warnings), <code>/api/sensor</code> (IoT in),{" "}
                <code>/api/pipeline/&lt;id&gt;</code> (agent trail), <code>/api/device/&lt;group&gt;</code> (siren out).
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
