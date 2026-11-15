"use client";

import { useState } from "react";
import type { LedgerEntry } from "@/lib/ledger";
import type { WorkerGroup } from "@/lib/types";

const rm = (n: number) => `RM${n.toLocaleString("en-MY")}`;

export function AidPanel({
  groups,
  eligible,
  ineligibleReason,
  paid,
  onPay,
}: {
  groups: WorkerGroup[];
  eligible: boolean;
  ineligibleReason: string;
  paid: boolean;
  onPay: (perWorker: number) => void;
}) {
  const [perWorker, setPerWorker] = useState(200);
  const workers = groups.reduce((n, g) => n + g.members, 0);
  return (
    <section aria-labelledby="aid-title" className="rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 id="aid-title" className="text-[15px] font-bold">Relief payouts</h3>
        <span className="rounded-full bg-deep px-2 py-0.5 text-[11.5px] font-medium text-mist-dim">Simulation, no money moves</span>
      </div>
      <p className="mt-1 text-[12.5px] leading-snug text-mist-dim">
        From an employer or NGO relief fund, over DuitNow to each worker&rsquo;s bank account or e-wallet. Every payout is written to the ledger.
      </p>
      {!eligible ? (
        <p className="mt-3 text-[13px]">{ineligibleReason}</p>
      ) : paid ? (
        <p className="mt-3 text-[13px]">
          <strong>Paid for this event.</strong> A second payout for the same event is blocked, so nobody is paid twice.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[13px]">
            RM
            <input
              type="number"
              min={50}
              max={1000}
              step={50}
              value={perWorker}
              onChange={(e) => setPerWorker(Math.max(0, Number(e.target.value)))}
              className="w-20 rounded-lg border border-line bg-white px-2 py-1.5 text-[14px] tabular-nums"
              aria-label="Amount per worker in ringgit"
            />
            per worker
          </label>
          <button
            type="button"
            onClick={() => onPay(perWorker)}
            disabled={perWorker <= 0}
            className="rounded-full bg-ink px-4 py-2 text-[13.5px] font-medium text-white hover:bg-black disabled:opacity-50"
          >
            Release {rm(perWorker * workers)} to {workers.toLocaleString()} workers
          </button>
        </div>
      )}
    </section>
  );
}

export function LedgerPanel({
  chain,
  onCheck,
  onTamper,
  status,
  tampered,
}: {
  chain: LedgerEntry[];
  onCheck: () => void;
  onTamper: () => void;
  status: string | null;
  tampered: boolean;
}) {
  return (
    <section aria-labelledby="ledger-title" className="overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#141414] text-[#e8e4db]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-3.5">
        <h3 id="ledger-title" className="text-[15px] font-bold">Public ledger</h3>
        <span className="text-[12px] text-[#9a958b]">Each entry carries the fingerprint of the one before it</span>
      </div>
      <ol className="mt-2 max-h-72 space-y-2 overflow-y-auto px-4 pb-3 font-mono text-[11.5px] leading-relaxed">
        {chain.length === 0 && <li className="text-[#9a958b]">Empty. Sent warnings and payouts appear here.</li>}
        {chain
          .slice()
          .reverse()
          .map((e) => (
            <li key={e.n} className="border-t border-[#2a2a2a] pt-2 first:border-0 first:pt-0">
              <span className="text-[#9a958b]">#{e.n} {e.time}</span>{" "}
              <span className={e.kind === "payout" ? "text-[#7bd88f]" : "text-[#f2b632]"}>{e.kind}</span>
              {e.amountRm > 0 && <span className="text-white"> {rm(e.amountRm)}</span>}
              <br />
              <span className="font-sans text-[12.5px] text-white">{e.summary}</span>
              <br />
              <span className="text-[#9a958b]">
                ref {e.ref} &nbsp;hash {e.hash.slice(0, 12)}… &nbsp;prev {e.prev.slice(0, 8)}…
              </span>
            </li>
          ))}
      </ol>
      <div className="flex flex-wrap items-center gap-2 border-t border-[#2a2a2a] px-4 py-3">
        <button type="button" onClick={onCheck} disabled={!chain.length} className="rounded-full bg-[#e8e4db] px-3.5 py-1.5 text-[13px] font-medium text-[#111] disabled:opacity-40">
          Check the ledger
        </button>
        <button
          type="button"
          onClick={onTamper}
          disabled={chain.length < 2}
          className="rounded-full border border-[#444] px-3.5 py-1.5 text-[13px] text-[#e8e4db] hover:border-[#777] disabled:opacity-40"
        >
          {tampered ? "Undo the edit" : "Secretly edit an old entry"}
        </button>
        {status && (
          <p aria-live="polite" className={`w-full text-[13px] ${status.startsWith("All") ? "text-[#7bd88f]" : "text-[#ff8a8d]"}`}>
            {status}
          </p>
        )}
      </div>
    </section>
  );
}
