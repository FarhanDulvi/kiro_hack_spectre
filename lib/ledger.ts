"use client";

/**
 * A tamper-evident log. Each entry stores the hash of the one before it, so
 * changing any past entry breaks every hash after it. This is the useful part
 * of a blockchain (a shared record nobody can quietly edit) without a token.
 */
export type LedgerEntry = {
  n: number;
  time: string;
  kind: "warning" | "payout";
  summary: string;
  amountRm: number;
  ref: string;
  prev: string;
  hash: string;
};

const GENESIS = "0".repeat(64);

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const body = (e: Omit<LedgerEntry, "hash">) =>
  JSON.stringify([e.n, e.time, e.kind, e.summary, e.amountRm, e.ref, e.prev]);

export async function append(
  chain: LedgerEntry[],
  entry: Pick<LedgerEntry, "kind" | "summary" | "amountRm" | "ref">,
): Promise<LedgerEntry[]> {
  const prev = chain.at(-1)?.hash ?? GENESIS;
  const draft = { ...entry, n: chain.length + 1, time: new Date().toLocaleTimeString("en-GB"), prev };
  return [...chain, { ...draft, hash: await sha256(body(draft)) }];
}

/** Returns the number of the first broken entry, or null if the chain is intact. */
export async function firstBroken(chain: LedgerEntry[]): Promise<number | null> {
  let prev = GENESIS;
  for (const e of chain) {
    if (e.prev !== prev || (await sha256(body(e))) !== e.hash) return e.n;
    prev = e.hash;
  }
  return null;
}

/** A DuitNow-style reference for the simulation. Not a real transfer. */
export const simRef = (seed: string) =>
  "SIM-DN-" + [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString().padStart(10, "0").slice(0, 10);
