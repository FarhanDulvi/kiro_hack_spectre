# Perisai

**Official disaster warnings, in the languages Malaysia's migrant workers read. Detect, verify, respond.**

- **Live app:** https://perisai.onrender.com
- **30-second guided demo:** https://perisai.onrender.com/dashboard?demo=1
- **Architecture:** https://perisai.onrender.com/architecture

Built on 15 November 2026 at the STC Mini Hackathon (theme: Disaster Recovery) by Farhan (lead), Resam, Yara and Rehan Veeran. *Perisai* is Malay for "shield".

> The live app runs on Render's free plan. If it has been idle, the first visit can take about a minute to wake up.

## The problem

Malaysia's 2026/27 northeast monsoon began on 27 October and runs to March 2027, with 3,682 flood hotspots on alert. Official warnings from MetMalaysia, JPS and NADMA go out in Malay and English. Many of the migrant workers who build Malaysia's homes and run its factories read Bengali, Nepali, Burmese, Indonesian, Hindi or Urdu, and hear about floods through rumours in group chats.

## What Perisai does

Four agents run in a fixed order. Each one hands the next a message, and each one can stop the next. The full trail is visible in the dashboard's agent log and at `/api/pipeline/<alertId>`.

| Agent | Step | What it does |
|---|---|---|
| Watchtower | Detect | Reads live MetMalaysia warnings and ESP32 river-level sensors. Pulls out the hazard, severity (JPS gauge bands: waspada, amaran, bahaya) and the exact states and districts named. |
| Auditor | Verify | Scores how many independent sources agree: the official warning, a river sensor, nearby live weather warnings. **No official source, no alert:** a sensor reading on its own is held for a person. |
| Herald | Warn | Builds the message from a six-language phrasebook (each phrase has an exact English meaning), sends it only to worker groups inside the warned districts, adds a voice note, and rings the dorm siren boxes. Never sends the same event to the same group twice. |
| Treasurer | Pay and record | Releases relief payouts over DuitNow (simulated), once per event, and writes every warning and payout to a SHA-256 hash-chained ledger. Editing any past entry is detected. |

## Try it

1. Open the [dashboard](https://perisai.onrender.com/dashboard) and press **Play the 30-second demo**, or:
2. Pick a live MetMalaysia warning on the left and press **Run Perisai**. A warning that names Petaling reaches only the Petaling groups; the Klang groups next door stay quiet.
3. Tick **Show the English meaning** to see exactly what each worker reads.
4. Voice notes use the browser's own voices. Microsoft Edge has Bengali, Nepali, Burmese and Urdu voices; Chrome has Hindi and Indonesian.

## What is real and what is simulated

| Part | Status |
|---|---|
| MetMalaysia warnings | Live, from `https://api.data.gov.my/weather/warning` |
| Targeting by state and district | Real logic on live data |
| Six-language messages | Built from an AI-drafted phrasebook. **Native-speaker review is still needed before any real use.** |
| Worker groups, JPS/NADMA samples, river readings | Fictional demo data, labelled in the app |
| DuitNow payouts | Simulated. No money moves |
| Ledger | Real SHA-256 hash chain, kept in the browser session |

## Endpoints

| Endpoint | What it does |
|---|---|
| `GET /api/official` | Live MetMalaysia warnings plus the built-in samples |
| `POST /api/sensor` | IoT in: river sensors post readings. Header `x-device-key` (default `perisai-demo`; set `SENSOR_KEY` to change it) |
| `GET /api/sensor` | Latest reading from each sensor |
| `GET /api/pipeline/<alertId>` | Runs the four agents on one alert and returns their message trail. Read-only: nothing is sent |
| `GET /api/device/<groupId>` | IoT out: what a dorm siren box should do right now. `?sample=sample-flood` forces a sample |

Example: https://perisai.onrender.com/api/pipeline/sample-flood

## Hardware (`iot/`)

- `iot/river-sensor`: ESP32 + HC-SR04 ultrasonic sensor mounted above a river. Posts the water level to `/api/sensor` every minute.
- `iot/dorm-siren`: ESP32 + RGB LED + buzzer in a worker dormitory. Polls `/api/device/<group>`, lights up in the gauge colour and buzzes, for workers whose phones are on silent.

Wiring and parts are in the comments at the top of each sketch.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. No API keys are needed.

## Deploy

`render.yaml` defines a free Node web service on Render: New, Blueprint, pick this repo.

## Built with

Next.js 16 and TypeScript, Tailwind CSS, d3-geo with DOSM state boundaries, Web Crypto for the ledger, the browser's speech engine for voice notes, and Space Grotesk, Instrument Serif and Noto fonts.

## Credits

- Live warnings: MetMalaysia via data.gov.my. State boundaries: DOSM open data (`dosm-malaysia/data-open`).
- The agent pattern (Watchtower, Auditor, Treasurer) and the architecture page layout were adapted, with permission, from an open-source disaster-relief project by GitHub user debojyoti10CC. Perisai adds the Herald and replaces image detection and crypto payouts with official Malaysian feeds, river sensors and DuitNow.
