# I Built an AI Running Coach That Talks to You in Real-Time — Here's How

*By Aditya Kumar Singh, Manipal Institute of Technology*

What if your running app could actually **coach** you — not just track you?

That question turned into a few weeks of nights and weekends, and the result is **RunCoach AI**: a full-stack web app that watches your GPS stats live, decides when you need feedback, and *speaks* it to you in a voice and personality you choose — Blaze the hype-machine, Metric the data nerd, or Commander the drill sergeant. No wearable, no subscription, no hardware. Just a phone browser and three free-tier APIs stitched together with more care than I expected to need.

This post is the technical walkthrough: the architecture, the formulas, the API glue, and the things that broke along the way.

## The Problem

Every running app on your phone does the same thing: it draws a blue line on a map and tells you your pace after the fact. That's tracking, not coaching. A real coach listens to how you're doing *right now* and adjusts what they say — "you're fading, ease up" or "nice, you just PR'd that split." Human coaches who do this cost upwards of $100/month, and most runners training for a 5K or half marathon aren't going to hire one.

I wanted the middle ground: an app that behaves like it's paying attention. Not a static plan, not a post-run report card — a voice in your ear that reacts to your actual splits, your actual pace drift, your actual milestones, while you're mid-run.

## The Solution

The core idea is simple to state and mildly annoying to implement well: sample the runner's live stats, decide algorithmically *when* something is worth saying, hand that moment to an LLM to phrase it in-character, convert the phrasing to audio, and play it — all inside a couple of seconds, without the runner touching their phone.

Here's the pipeline, end to end:

```
┌─────────────┐     ┌───────────────┐     ┌─────────────┐     ┌──────────────┐     ┌────────┐
│   Browser   │     │   Trigger     │     │  Groq LLM   │     │  ElevenLabs  │     │ Audio  │
│  GPS Points │───▶│   Engine      │───▶│ (Llama 3.3  │───▶│  Neural TTS  │───▶│Element │
│ (watchPosi- │     │ (split, pace  │     │ 70B, per-   │     │ (personality │     │ plays  │
│  tion API)  │     │ drop/surge,   │     │ sonality    │     │  voice map)  │     │on phone│
│             │     │ milestone,    │     │ system      │     │              │     │        │
│  Haversine  │     │ 2-min check-  │     │ prompt +    │     │  fallback:   │     │        │
│  distance + │     │ in)           │     │ live stats) │     │  Web Speech  │     │        │
│  filtering  │     │               │     │             │     │  API (free)  │     │        │
└─────────────┘     └───────────────┘     └─────────────┘     └──────────────┘     └────────┘
       │                                                                                ▲
       └────────────────── Zustand store + batch POST every 10s ─────────────────────┘
                                    (persisted to Postgres via Prisma)
```

Every box in that diagram is a real constraint I had to design around, so let's go through them one at a time.

## Technical Deep-Dive

### 1. GPS Tracking: Haversine, Filtering, and Batch Upload

The browser's `watchPosition()` API is the only sensor I have, and it is noisy. Every fix comes with a `latitude`, `longitude`, `accuracy`, and `speed`, and a meaningful fraction of those fixes are garbage — accuracy readings of 50+ meters, phantom speed spikes from GPS drift, duplicate points when the phone is stationary.

Distance between two consecutive points is computed with the Haversine formula, which treats the Earth as a sphere and gives great-circle distance from two lat/lng pairs:

```ts
export function haversineDistance(lat1, lon1, lat2, lon2): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

Before that distance is trusted, each incoming point is filtered:

```ts
export function isValidGpsPoint(point: { accuracy?: number; speed?: number }) {
  if (point.accuracy !== undefined && point.accuracy >= 30) return false; // >30m = unreliable fix
  if (point.speed !== undefined && point.speed >= 12) return false;       // 12 m/s ≈ 43 km/h — not a human run
  return true;
}
```

Rejecting anything with >30m accuracy or an "impossible" 43 km/h speed spike kills most of the jitter that would otherwise make the live pace jump around like a Geiger counter. On top of that, current pace is smoothed with a trailing window average rather than computed from the single latest point:

```ts
export function smoothPace(points: Array<{ pace: number }>, windowSize: number) {
  const window = points.slice(-windowSize);
  const validPoints = window.filter((p) => p.pace > 0 && isFinite(p.pace));
  if (validPoints.length === 0) return 0;
  return validPoints.reduce((acc, p) => acc + p.pace, 0) / validPoints.length;
}
```

Points aren't sent to the server as they arrive. They accumulate in a Zustand store client-side and get batch-POSTed to `/api/runs/[runId]/points` every 10 seconds. That's a deliberate trade-off: fewer round trips, less battery drain, and if the connection drops mid-run, at most 10 seconds of points are at risk instead of one request per GPS tick.

### 2. The AI Coaching Pipeline: Groq, Personalities, and Triggers

This is the part I spent the most time on, because "just call an LLM every 30 seconds" produces an annoying, repetitive coach. The fix was separating *when to speak* from *what to say*.

**When to speak** is a deterministic trigger system (`coaching-triggers.ts`) with zero LLM involvement — it runs on every stats update and checks, in priority order:

1. **Split complete** — crossed a new km/mile boundary
2. **Milestone** — crossed 1K, 5K, 10K, half, or full marathon distance
3. **Pace drop** — current pace >15% slower than the running average
4. **Pace surge** — current pace >10% faster than the running average
5. **Interval check-in** — a fallback: if none of the above fired and it's been 2+ minutes of silence, say *something*

```ts
const paceRatio = current.currentPaceSecsPerKm / current.avgPaceSecsPerKm;
if (paceRatio > 1.15) return { trigger: "pace_drop", message: buildContextMessage(...) };
if (paceRatio < 0.9)  return { trigger: "pace_increase", message: buildContextMessage(...) };
```

**What to say** is where Groq comes in. I use Groq's free-tier inference of **Llama 3.3 70B Versatile** because it's fast enough for a "feels live" voice coach — this isn't a use case that tolerates 5-second LLM latency — and because it's free, which matters when the target user is a broke college runner, not a startup with a token budget.

Each of the three built-in personalities is a long, carefully-written system prompt, not a one-liner. Blaze (motivational), Metric (analytical), and Commander (drill sergeant) each get explicit instructions on vocabulary, tone, how to react to a pace drop vs. a milestone, and a hard constraint: *keep every response under ~40 words / 15 seconds of speech*, because nobody wants their coach to still be talking three splits later.

```ts
export async function generateCoachingResponse(systemPrompt, runContext, trigger) {
  const completion = await getGroqClient().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `[Trigger: ${trigger}]\n${runContext}\n\nGive a short coaching response (under 40 words).` },
    ],
    max_tokens: 150,
    temperature: 0.8,
  });
  return completion.choices[0]?.message?.content ?? "";
}
```

There's also a memory-aware variant (`generateCoachingWithMemory`) that pulls the runner's most recent completed run from Postgres and slips it into the prompt, so the coach can say things like "faster than Tuesday's pace already" instead of treating every run as day one. The same Groq pipeline also powers the offline stuff: post-run analysis, AI-generated run titles ("Rainy Recovery Run"), 4-week training plans from a stated goal, and recovery advice — all short, targeted prompts rather than one do-everything mega-prompt.

### 3. Voice Synthesis: ElevenLabs with a Free Fallback

Text from Groq goes to `/api/coaching/speak`, which calls ElevenLabs' TTS endpoint. Each personality maps to a distinct voice ID so Blaze, Metric, and Commander don't all sound the same:

```ts
const VOICE_MAP = {
  motivational: "pNInz6obpgDQGcFmaJgB", // "Adam" — warm male
  analytical: "ErXwobaYiN019PkySvjV",   // "Antoni" — clear male
  drill_sergeant: "VR6AewLTigWG4xSOukaG", // "Arnold" — deep commanding
} as const;
```

ElevenLabs' neural voices sound dramatically more human than anything free, but the free tier has a character quota, and I didn't want the whole app to die the moment it's exhausted. So the client-side hook wraps the fetch in a fallback chain: if the API returns a 503 (no key configured or quota state), it drops straight to the browser's built-in `SpeechSynthesisUtterance` — the Web Speech API — which is robotic but works everywhere, offline, for free, forever.

```ts
fetch("/api/coaching/speak", { method: "POST", ... })
  .then(res => { if (res.status === 503) throw new Error("NO_TTS"); ... })
  .catch(err => {
    if (err.message === "NO_TTS" && "speechSynthesis" in window) {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    }
  });
```

Coaching lines are also queued, not fired-and-forgotten — a `queueRef` array plus an `isPlayingRef` flag ensures that if two triggers fire close together (say, a split completes right as a milestone is crossed), the coach says both things back-to-back instead of talking over itself or dropping one.

### 4. Real-Time Map: MapLibre GL and CARTO Dark Tiles

The live run map uses **MapLibre GL** via `react-map-gl` — open-source, no API key, no per-load billing, which matters a lot when your whole pitch is "free to run." Tiles come from CARTO's `dark-matter-gl-style`, which looks genuinely good on a phone screen at night and, more importantly for outdoor use, doesn't wash out your eyes with a blinding white basemap mid-run.

The route itself is a GeoJSON `LineString` built live from accumulated GPS points and rendered through a single `Source`/`Layer` pair:

```ts
const geojson: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: positions.length >= 2
    ? [{ type: "Feature", properties: {}, geometry: {
        type: "LineString",
        coordinates: positions.map((p) => [p.longitude, p.latitude]),
      }}]
    : [],
};
```

In live mode, the camera eases to the latest position every update (`map.easeTo(...)`); in replay mode (viewing a past run), it instead fits the viewport to the full route's bounding box once. The live position gets a pulsing lime-green marker (`animate-ping` + a solid dot) so it reads clearly against the dark tiles at a glance.

### 5. Analytics: Recharts, Riegel Predictions, and Streaks

Post-run, the data becomes charts and predictions. Weekly volume and pace trends are Recharts bar/line charts pulled from aggregated Prisma queries. Two pieces are worth calling out specifically:

**Race time prediction** uses the **Riegel formula**, a well-established endurance-running model: `t2 = t1 × (d2/d1)^1.06`. Given a recent pace, I derive an implied 1km reference time and extrapolate to any target distance:

```ts
export function predictRaceTime(recentPaceSecsPerKm: number, targetDistanceKm: number) {
  const referenceTimeS = recentPaceSecsPerKm * 1; // implied 1km time
  const predictedSeconds = referenceTimeS * Math.pow(targetDistanceKm / 1, 1.06);
  ...
}
```

The 1.06 exponent captures the real-world fact that pace degrades non-linearly over longer distances — you can't just multiply your 5K pace by 8.4 to get a marathon prediction; fatigue compounds.

**Pace variability analysis** compares first-half vs. second-half split averages to classify a run as an even effort, a positive split (slowing down — bad), or a negative split (speeding up — the gold standard in distance running), using standard deviation as a percentage of the mean pace to flag inconsistency.

**Streaks and achievements** run entirely on calendar-day set logic — collect unique `YYYY-MM-DD` days a run happened, sort them, and walk the sorted list counting consecutive-day runs, both for the current streak (must include today or yesterday) and the max streak ever. Thirteen achievement badges — from "First Steps" to a sub-4:00/km "Lightning" badge — are pure predicate functions over aggregate stats, checked on every dashboard load.

## Challenges

Three things fought back the hardest:

- **Browser GPS backgrounding.** Mobile browsers throttle or fully suspend `watchPosition()` when a tab is backgrounded or the screen locks — there's no way around this from web-app-land. The mitigation is the Wake Lock API (`useWakeLock`), which keeps the screen on during an active run, plus UI copy that's upfront about the limitation instead of pretending it doesn't exist.

- **Voice latency.** An LLM round-trip plus a TTS round-trip, done naively in series after every stats tick, feels sluggish and breaks the illusion of a coach who's "with you." The trigger system solves half of this by not calling the AI pipeline at all unless something is actually worth saying — most 30-second windows produce zero API calls. The other half is the audio queue, which keeps playback smooth even when multiple triggers land in a tight window.

- **Pace smoothing without lag.** A too-small smoothing window still jitters; a too-large one makes the "current pace" feel stale and unresponsive to real effort changes. Tuning the trailing window size, combined with the upstream accuracy/speed filtering, was mostly empirical — run it, watch the numbers, adjust.

## Results

RunCoach AI ended up as a genuinely complete product: GPS-tracked runs with live maps, three distinct AI voice personalities (plus a fourth, user-customizable one), weather-aware coaching via Open-Meteo, GPX/CSV export for anyone who wants their data in Strava or elsewhere, shareable run cards, achievement badges, streak tracking, and Riegel-based race predictions — 17 features in total, and every single external API involved (Groq, ElevenLabs free tier, Open-Meteo, MapLibre/CARTO) is free to run at hobbyist scale. No subscription, no paid map tiles, no locked-in vendor.

## Try It

The code is on GitHub — clone it, drop in a free Groq key and (optionally) an ElevenLabs key, and it runs locally with SQLite in about five minutes. A live demo is deployed and linked in the repo README.

**GitHub:** `<add your repo URL here>`
**Live demo:** `<add your deployed URL here>`

If you build on it, or just want to argue about the Riegel exponent, open an issue.
