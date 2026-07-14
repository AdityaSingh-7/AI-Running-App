# RunCoach AI — Technical Documentation

RunCoach AI is a full-stack, mobile-first running coach built on Next.js 16 (App Router) that tracks a run via the browser Geolocation API, streams live stats to the UI, and uses an LLM (Groq/Llama 3.3 70B) plus neural TTS (ElevenLabs, with a Web Speech API fallback) to deliver spoken, personality-driven coaching in near real time.

---

## 1. Architecture Overview

### System diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                              │
│                                                                             │
│  ┌───────────────┐   watchPosition()   ┌───────────────────────────────┐  │
│  │ Geolocation    │────────────────────▶│  useGeolocation / useSimGps   │  │
│  │ API            │                     └───────────────┬───────────────┘  │
│  └───────────────┘                                       │ GeoPosition[]   │
│                                                           ▼                 │
│                                              ┌────────────────────────┐    │
│                                              │  useRunSession          │    │
│                                              │  (haversine + pace calc)│    │
│                                              └────────────┬────────────┘    │
│                                                           │ stats           │
│                            ┌──────────────────────────────┼────────────┐  │
│                            ▼                               ▼            │  │
│                 ┌────────────────────┐          ┌──────────────────┐   │  │
│                 │  RunMap (MapLibre) │          │  VoiceCoach       │   │  │
│                 │  live polyline      │          │  (trigger check) │   │  │
│                 └────────────────────┘          └─────────┬────────┘   │  │
│                                                            │             │  │
│  Zustand store (run-store.ts) ◀───────────────────────────┘             │  │
└───────────────────────────────────────────┬───────────────────────────────┘
                                             │ fetch() — batched every 10s
                                             ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                          NEXT.JS API ROUTES (server)                       │
│                                                                             │
│  /api/runs                POST create run, GET history (paginated)        │
│  /api/runs/[id]/points     POST batch GPS points  (zod-validated)         │
│  /api/runs/[id]            PATCH finalize run (distance/duration/pace)    │
│  /api/coaching/generate    POST → Groq LLM coaching text                  │
│  /api/coaching/speak       POST → ElevenLabs TTS audio (mpeg buffer)      │
│  /api/coaching/analyze     POST → post-run LLM analysis                  │
│  /api/coaching/recovery    GET  → recovery advice (Riegel-adjacent logic) │
│  /api/goals/plan           POST → 4-week LLM training plan               │
│  /api/analytics/*          GET  → aggregates, race predictions, records  │
│  /api/weather              GET  → Open-Meteo passthrough (cached 10min)  │
│  /api/auth/[...nextauth]   NextAuth v5 (Credentials + GitHub OAuth)       │
│                                                                             │
│         auth() session check on every protected route                    │
└───────────┬────────────────────┬───────────────────────┬──────────────────┘
            │                    │                       │
            ▼                    ▼                       ▼
   ┌─────────────────┐  ┌──────────────────┐   ┌──────────────────────┐
   │  PostgreSQL      │  │  Groq API         │   │  ElevenLabs API      │
   │  (via Prisma)    │  │  Llama 3.3 70B     │   │  TTS (per-personality│
   │  User/Run/       │  │  ~200ms latency    │   │  voice_id)            │
   │  RunPoint/Split   │  └──────────────────┘   └──────────────────────┘
   └─────────────────┘
```

### Data flow: Client → API Routes → Groq/ElevenLabs → Client

1. `useGeolocation` (or `useSimulatedGps` in demo mode) collects raw `GeolocationPosition` updates and filters them (accuracy/speed/jitter — see §2).
2. `useRunSession` re-derives `distanceMeters`, `avgPaceSecsPerKm`, and `currentPaceSecsPerKm` from the accumulated point array on every update (Haversine + a 30s rolling window).
3. `VoiceCoach` compares the new stats snapshot against the previous one via `checkTriggers()` (§3). If a trigger fires, it calls `triggerCoaching(trigger, context)`.
4. `useVoiceCoach.triggerCoaching` POSTs to `/api/coaching/generate` with `{ personality, trigger, runContext }`.
5. The route handler (`src/app/api/coaching/generate/route.ts`) loads the coach's system prompt (`coaching-personalities.ts`), fetches the user's last completed run from Postgres for memory context, and calls `generateCoachingWithMemory()` in `lib/groq.ts`, which hits the Groq Chat Completions API (`llama-3.3-70b-versatile`).
6. The generated text is returned to the client, displayed as a transcript, and queued for speech: `useVoiceCoach` first tries `/api/coaching/speak` (ElevenLabs). If ElevenLabs returns 503 (no API key) or errors, it falls back to the browser's `SpeechSynthesisUtterance` API.
7. In parallel, GPS points accumulate client-side and are batch-flushed to `/api/runs/[runId]/points` every 10 seconds (and once more on stop) — see §2 Batch Upload Strategy.
8. On stop, the client PATCHes `/api/runs/[runId]` with final aggregates (`totalDistanceM`, `totalDurationS`, `avgPaceSPerKm`), and the run becomes queryable from `/history` and `/api/analytics/*`.

### Database schema summary

Prisma + PostgreSQL, models: `User`, `Account`/`Session`/`VerificationToken` (NextAuth adapter tables), `UserPreferences` (1:1 with User — coach choice, units, voice toggle), `Run` (1 row per run, denormalized aggregates), `RunPoint` (many rows per run — raw GPS trace), `RunSplit` (one row per completed km/mile), `CoachingSession` + `CoachingFeedback` (1:1 with Run, log of what the AI said and when). Full detail in §8.

---

## 2. GPS Tracking System

### Haversine Formula

The Haversine formula computes the great-circle distance between two lat/lon points on a sphere — the standard choice for short-range GPS distance calculations.

```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
c = 2 × atan2(√a, √(1-a))
distance = R × c  (where R = 6371000 meters)
```

Where `Δlat = lat2 - lat1` and `Δlon = lon2 - lon1`, both converted to radians before use (trig functions expect radians, GPS coordinates arrive in degrees).

Step-by-step for two nearby points:
1. Convert both latitudes/longitudes from degrees to radians: `rad = deg × (π / 180)`.
2. Compute `Δlat` and `Δlon` in radians.
3. Compute the haversine of the angular distance, `a`, which blends the latitude difference with the longitude difference scaled by the cosine of both latitudes (this cosine term accounts for the fact that a degree of longitude covers less physical distance near the poles than at the equator).
4. Compute the central angle `c` via `atan2`, which is numerically stable at both very small and very large angular distances (unlike a plain `asin`).
5. Multiply by Earth's mean radius `R = 6,371,000 m` to convert the angle into linear meters.

Implementation lives in `src/lib/geo.ts`:

```ts
export function haversineDistance(lat1, lon1, lat2, lon2): number {
  const R = 6371000;
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

It is called in two places: `useGeolocation.handleSuccess` (jitter filtering — comparing a new fix to the previous accepted one) and `useRunSession.computeStats` (summing consecutive point-to-point distances to get total distance and windowed distance for pace).

#### Why Haversine vs Vincenty (speed vs accuracy tradeoff)

- **Haversine** assumes a perfect sphere. Error versus the real (ellipsoidal) Earth is at most ~0.5%, which for a 10 km run is roughly ±50 m of *systematic* bias — negligible next to consumer GPS accuracy (which itself is typically 3–15 m, sometimes 30 m+ under tree cover or urban canyons).
- **Vincenty's formula** models the Earth as an oblate spheroid and is accurate to sub-millimeter, but is iterative (typically converges in a handful of iterations of an inverse geodesic problem) and meaningfully more expensive computationally.
- The point-to-point distances being summed here are calculated dozens to hundreds of times per run, client-side, on a phone, in a tight loop (`computeStats` re-runs the full point array on every position update). Haversine's O(1) closed-form trig is fast enough to run synchronously in a React effect on every GPS tick; Vincenty's extra precision would be invisible given GPS receiver noise is already the dominant error source.
- **Conclusion**: accuracy delivered by GPS hardware is the bottleneck, not the distance formula, so the cheaper, closed-form Haversine is the correct engineering choice.

### GPS Point Filtering

Three filters run in `useGeolocation.handleSuccess` (and `isValidGpsPoint` in `lib/geo.ts` is a reusable variant of the first two), in this order:

**1. Accuracy filter — discard points with `accuracy >= 30` meters.**
`GeolocationPosition.coords.accuracy` is the radius (in meters) of the 68% confidence circle reported by the device. Values above ~30 m typically indicate the device fell back to network/cell-tower positioning (e.g., indoors, under a bridge, dense tree canopy) rather than a real GPS/GNSS fix. Accepting these points would inject large, non-Gaussian position jumps into the distance sum.

**2. Jitter filter — discard if `< 3m` from the previous accepted point (via Haversine).**
Even with a "good" fix, consumer GPS receivers oscillate a few meters around the true position when the device is stationary or moving very slowly (multipath reflections, ionospheric variance, receiver clock noise). Without this filter, a runner standing still would appear to "drift" a few centimeters to a few meters every second, and because these tiny movements are summed over an entire run, they compound into meaningfully inflated total distance. A 3 m floor is below typical single-fix noise but above meaningful running motion (even walking pace covers >1m/s).

**3. Speed filter — discard if `speed >= 12` m/s (43.2 km/h).**
`coords.speed` (when available) or an implied speed from consecutive fixes represents an upper bound no unassisted human runner will exceed (the outdoor world 100m record pace is ~10.4 m/s; 12 m/s gives headroom while still rejecting GPS "teleport" glitches — a classic failure mode where a bad fix reports the device 200m away in one second, implying an impossible speed).

Why these specific thresholds: they are grounded in real-world consumer GPS behavior (chipset accuracy specs, typical noise floor for L1 GPS without SBAS/differential correction) and in the physical limits of running, rather than being arbitrary — they are the standard thresholds used by production run-tracking apps (Strava, Runkeeper) for the same reasons.

### Pace Calculation

**Instantaneous/average pace**: `calculatePace(distanceMeters, durationSeconds) = durationSeconds / (distanceMeters / 1000)`, i.e., seconds elapsed per kilometer covered. This is computed twice per stats refresh: once over the *entire* run (average pace) and once over a *rolling window* (current pace).

**Rolling window smoothing — 30-second window average.**
`useRunSession.computeStats` recomputes "current pace" using only the GPS points whose timestamp falls within the last `CURRENT_PACE_WINDOW_SECS = 30` seconds: it sums the Haversine distance between consecutive points in that window and divides by the elapsed time across the window.

Why smoothing is needed: instantaneous point-to-point pace (i.e., pace derived from just the last two GPS fixes) is extremely noisy — a single few-meter jitter or a brief accuracy dip can swing a two-point pace estimate by tens of seconds/km even though the runner's actual effort hasn't changed. Averaging over a 30-second window (typically 5–15 accepted points after filtering) smooths out fix-to-fix noise while still being responsive enough to reflect a genuine pace change (e.g., stopping at a light, or surging) within half a minute — short enough that the AI coach's "pace drop" trigger (§3) still feels timely.

### Batch Upload Strategy

GPS points are **not** sent to the server one at a time. Instead, `src/app/(app)/run/active/page.tsx` accumulates points in client memory (`positionsRef`) and flushes any *unsent* points to `POST /api/runs/[runId]/points` on a fixed interval.

```ts
const GPS_FLUSH_INTERVAL_MS = 10_000;
```

- **Why batch**: (1) Reduces HTTP/API overhead — sending one fetch per GPS fix (every ~1s) would be 10x more network round-trips, each with its own TLS/auth/DB-transaction overhead, for no benefit since nothing downstream needs sub-second point persistence. (2) Handles brief connectivity drops gracefully — if a flush fails (e.g., momentary network loss common while running outdoors), the code simply does not advance `flushedUpToRef`, so the *same* unflushed points are retried on the next interval automatically, with no explicit retry-timer logic needed. (3) Reduces battery/radio wake-ups, which matters on a phone during a multi-kilometer run.
- **10-second interval, flush on stop**: A `setInterval` fires every 10s while `status === "active"`; `handleStop` explicitly calls `flushPositions` one final time before finalizing the run, guaranteeing no tail-end points are lost even if the run stops between scheduled flushes.
- **Retry on failure**: `flushPositions` tracks `flushedUpToRef` (a cursor into the positions array). It only advances that cursor after a successful (`res.ok`) response. On failure, the cursor stays put, so those exact points are included again in `pending` on the next tick — a simple, idempotent-by-construction retry mechanism (the server-side `createMany` will just insert the same rows again if a partial success occurred, since `RunPoint` rows have no natural uniqueness constraint on client-generated data — a known simplification, see Limitations).
- Server-side, `/api/runs/[runId]/points` validates the batch with a Zod schema (`batchPointsSchema`, min 1 point) before calling `prisma.runPoint.createMany({ data })` — one INSERT statement for the whole batch rather than N round-trips to Postgres.

---

## 3. AI Coaching System

### LLM Architecture (Groq + Llama 3.3 70B)

All coaching text generation goes through `src/lib/groq.ts`, using the official `groq-sdk` client against the model id `"llama-3.3-70b-versatile"`.

**Why Groq**: Groq provides an OpenAI-compatible Chat Completions API but runs inference on custom LPU (Language Processing Unit) hardware rather than GPUs, which gives dramatically lower per-token latency for open-weight models — typically in the ~150–250ms range for a full short response, versus multi-second latencies common with GPU-hosted inference at similar model sizes. For a live coaching feature where the runner is mid-stride and expects near-instant feedback, this latency budget matters more than for a typical chat UI. Groq also has a generous free tier, which keeps the "entire AI stack is free" pitch true (paired with ElevenLabs' free tier).

**Why Llama 3.3 70B**: It is a strong instruction-following open-weight model — good at obeying strict formatting/length constraints ("under 40 words", "reference the runner's exact stats") and maintaining a consistent persona across turns, without the cost or vendor lock-in of a closed frontier model. For short, templated coaching lines (not long-form creative writing), a 70B open model is more than sufficient quality.

**Token limits and temperature settings** (all in `lib/groq.ts`):

| Function | max_tokens | temperature | Purpose |
|---|---|---|---|
| `generateCoachingResponse` / `generateCoachingWithMemory` | 150 | 0.8 | Live in-run coaching line |
| `generatePostRunAnalysis` | 300 | 0.7 | Post-run split/pacing analysis |
| `generateTrainingRecommendation` | 200 | 0.7 | "What should I run next" suggestion |
| `generateRunTitle` | 30 | 0.9 | Short catchy title for a completed run |
| `generateGoalPlan` | 600 | 0.7 | 4-week markdown training plan |
| `generateRecoveryAdvice` | 100 | 0.7 | Recovery-day guidance |

Live coaching uses a *higher* temperature (0.8) than analytical tasks because personality and variety matter more than strict determinism when a runner might hear the same trigger type (e.g., "interval check-in") dozens of times across a run — a higher temperature avoids the same 2-3 stock phrases repeating verbatim. Title generation uses the highest temperature (0.9) because creative variety is the entire point. Structured outputs like the training plan use a slightly lower temperature (0.7) to keep formatting (markdown headers, week structure) consistent.

**Context window management (responses < 40 words)**: The user-turn prompt in `generateCoachingResponse` explicitly instructs `"Give a short coaching response (under 40 words)"`, and every personality's system prompt independently reinforces `"Keep every response under 15 seconds of speech (roughly 35–45 words)"`. This double constraint (system prompt + per-call instruction) matters because: (1) TTS cost and latency scale with character count — shorter text means faster ElevenLabs synthesis and a smaller audio payload to stream; (2) a runner mid-stride cannot process a long spoken paragraph; 35–45 words is roughly what a person can say clearly in 12–15 seconds at a natural pace, which is the target "coaching burst" length; (3) it keeps Groq's own generation latency low, since output token count is the dominant driver of total request latency for autoregressive decoding.

### Personality System Prompts

`src/lib/coaching-personalities.ts` defines three built-in personas, each with a `systemPrompt`, a `voiceId` (mapped to an ElevenLabs voice), and a `feedbackStyle` metadata object (`tone`, `encouragement`, `dataDriven`, `pushIntensity`) used elsewhere in the UI to render style-appropriate visuals.

| Personality | Display name | Voice archetype | Psychology |
|---|---|---|---|
| `motivational` | Blaze 🔥 | warm, "we" language | **Motivational interviewing** — collaborative framing ("we're doing amazing"), empathy-first response to setbacks ("It's okay, let's find our rhythm together"), celebration of small wins. Designed to build self-efficacy rather than apply pressure. |
| `analytical` | Metric 📊 | clinical, numbers-first | **Data-driven feedback** — every response is required to cite exact current stats, diagnose likely causes for pace changes (fatigue threshold, heat, terrain), and prescribe a specific tactical correction (cadence, stride, breathing). Modeled on sports-science coaching style: information density over emotional framing. |
| `drill_sergeant` | Commander ⚔️ | commanding, military metaphor | **Tough love / high-pressure coaching** — zero tolerance for excuses, direct call-outs ("Your pace just dropped — that's not acceptable"), reframes discomfort as the point ("comfortable is where improvement dies"). Modeled on the "no excuses" school of athletic coaching that some runners respond to better than gentle encouragement. |

**How prompts include runner context**: personality prompts do not embed live stats themselves (they can't — they're static strings); instead, each prompt explicitly instructs the model to *use whatever stats it's given in the user turn* — e.g. Metric's prompt says "Reference the runner's exact current stats — current pace, average pace, distance covered, elapsed time, and splits — in every coaching response." The actual numbers are injected per-request by `formatRunContext()` in `/api/coaching/generate/route.ts`, which turns the `runContext` object (`distanceM`, `durationS`, `currentPaceSPerKm`, `avgPaceSPerKm`, `splitNumber`, `splitDurationS`, optional `weather`) into human-readable lines appended to the user message. This separation (persona = *how* to speak, injected context = *what* to speak about) is what makes each response feel both personalized and in-character.

A fourth path, `createCustomCoach(name, prompt)`, lets a user define their own persona; it wraps their free-text description with the same length constraint and stat-referencing instruction, and persists it to `localStorage` (client-only, not synced server-side — a deliberate scope-limiting simplification).

### Trigger System

`src/lib/coaching-triggers.ts` exports `checkTriggers(current, previous, lastTriggerTime, distanceUnit)`, evaluated on every stats update inside `VoiceCoach.tsx`. It checks conditions **in a fixed priority order** and returns the *first* match — so priority is implicit in check order, not an explicit score:

1. **`split_complete`** — fires when the runner crosses a new split boundary (1 km, or 1 mile if `distanceUnit === "miles"`), detected by comparing `Math.floor(distance / splitDistance)` between the previous and current snapshot.
2. **`milestone`** — fires when a fixed distance threshold is crossed: 1 km, 5 km, 10 km, half marathon (21,097 m), marathon (42,195 m).
3. **`pace_drop`** — fires when `currentPace / avgPace > 1.15`, i.e., current pace is **more than 15% slower** than the run's average pace so far (higher "seconds per km" = slower).
4. **`pace_increase`** — fires when `currentPace / avgPace < 0.9`, i.e., current pace is **more than 10% faster** than average.
5. **`interval`** — a catch-all check-in that fires if at least 2 minutes (`MIN_INTERVAL_MS = 120_000`) have elapsed since the last trigger of *any* kind, as long as the run has meaningful distance/time.

**Priority ordering / why this order**: split and milestone events are objective, discrete, "something just happened" moments — they take priority because they are time-critical (the split literally just ended) and rare enough that they should never be starved by more frequent checks. Pace-based triggers come next because they represent an ongoing state change worth flagging, but are checked *after* discrete events so a runner crossing both a split boundary and a pace threshold in the same tick hears about the split first (more concrete, more actionable). The interval trigger is last and gated by the 2-minute cooldown specifically so it acts as a *fallback* cadence — ensuring the coach says *something* periodically even during a long stretch with no splits/milestones/pace anomalies — without ever preempting a more specific, timely trigger.

**Threshold values and why**:
- **15% pace drop**: chosen to be well above normal pace variance (which is usually a few percent even in a "consistent" run — see §6 Pace Variability, where >10% variability across splits is already flagged as "inconsistent") but sensitive enough to catch a real slowdown (fatigue, hill, forced stop) within roughly the 30-second smoothing window.
- **10% pace increase**: intentionally a *lower* bar than the drop threshold (10% vs 15%). Positive reinforcement is cheap to over-trigger on (celebrating a modest speed-up rarely feels wrong), whereas over-triggering "you're struggling" commentary on normal fluctuation would feel naggy or discouraging — hence the asymmetric thresholds.
- **2-minute minimum interval**: long enough that the coach doesn't talk over itself or the runner's own thoughts/music, short enough that a runner on a long, uneventful stretch (no splits, no pace anomalies) still gets a check-in at least every two minutes.

Each trigger routes through `buildContextMessage()`, which formats the *exact* current stats (distance, elapsed time, current/average pace, split number, milestone label, or drop/gain percentage) into a plain-English instruction string sent as the LLM's user turn — e.g. for `pace_drop`: `"...Pace has dropped ~18% below average. Provide supportive feedback and pacing advice."` This is what lets a stateless LLM call produce a response that sounds like it's reacting to a specific, live moment.

### Multi-Run Memory

`/api/coaching/generate/route.ts` queries `prisma.run.findFirst({ where: { userId, status: "completed" }, orderBy: { startedAt: "desc" } })` on every coaching request to fetch the user's most recently completed run, then formats it (`formatLastRunSummary`) into a one-line summary (distance, duration, avg pace, date) and passes it into `generateCoachingWithMemory(systemPrompt, contextString, trigger, lastRunSummary)`. That function's user-turn prompt explicitly instructs: `"Previous run: {summary}\n\nCurrent run: {context}\n\n[Trigger: {trigger}]\nReference the previous run if relevant."`

**Why this makes coaching feel personalized**: without memory, every run's coaching is generated from a clean slate — the model can only ever comment on the current run's own numbers. With the last-run summary injected, the model can produce comparisons a human coach naturally would ("you're pacing faster than Tuesday's run" / "let's beat last time's 5K split"), which is a large part of what makes an AI coach feel like it "knows" the runner rather than reciting generic sports platitudes. This is a lightweight form of memory — one prior run, fetched fresh per request, with no persistent conversation history or vector recall — a deliberate simplification favoring low latency and simplicity over a richer long-term memory system.

---

## 4. Text-to-Speech Pipeline

### ElevenLabs Integration

`src/lib/elevenlabs.ts` implements `textToSpeech(text, personality)`:

**API call structure**: `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`, with header `xi-api-key`, JSON body `{ text, model_id: "eleven_monolingual_v1", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }`. The response body is raw MP3 audio bytes, read via `response.arrayBuffer()` and wrapped in a Node `Buffer`.

**Voice selection per personality** — a static map from personality id → ElevenLabs voice id:

```ts
const VOICE_MAP = {
  motivational: "pNInz6obpgDQGcFmaJgB", // "Adam" – warm male
  analytical:   "ErXwobaYiN019PkySvjV", // "Antoni" – clear male
  drill_sergeant: "VR6AewLTigWG4xSOukaG", // "Arnold" – deep commanding
};
```
`getVoiceId()` falls back to the `motivational` voice for unknown/custom personality ids, so a custom coach never fails to produce audio.

**Voice settings tuning**: `stability: 0.5` balances expressiveness against consistency (lower values are more emotionally variable/less predictable; higher values are flatter but more reliable) — 0.5 is a reasonable middle ground for a coach that should sound engaged but not erratic. `similarity_boost: 0.75` biases the generated voice toward closely matching the reference voice's timbre rather than allowing the model more creative latitude.

**Audio streaming vs buffer approach**: The implementation used here is **buffered**, not streamed — ElevenLabs supports a streaming endpoint, but this app calls the standard (non-streaming) endpoint, waits for the full MP3 to be generated server-side, then returns it as one complete `Response` with `Content-Type: audio/mpeg`. The client (`useVoiceCoach.drainQueue`) then does `res.blob()` → `URL.createObjectURL()` → `new Audio(url)`. This is simpler to implement and reason about (one request, one response, no chunked transfer handling), at the cost of the client waiting for the *entire* clip to finish generating before playback starts, rather than starting playback as the first bytes arrive.

**Latency optimization**: response text is capped at ~35–45 words specifically to keep ElevenLabs generation time low (synthesis time scales with character count); the API route returns the audio directly with an explicit `Content-Length` header (helps the browser plan buffering); and the `/api/coaching/speak` route fails fast with a `503` if `ELEVENLABS_API_KEY` isn't set, so the client doesn't wait out a slow network round trip before falling back to Web Speech.

### Web Speech API Fallback

**Why fallback is needed**: ElevenLabs requires a paid-tier-adjacent API key that may not be configured in every deployment (e.g., local dev, or once a free-tier quota is exhausted) — the app should never go silent just because a third-party TTS key is missing or rate-limited. `useVoiceCoach.drainQueue` treats an ElevenLabs `503` response as a sentinel (`throw new Error("NO_TTS")`) and, on catching it, falls back to `window.speechSynthesis` with a plain `SpeechSynthesisUtterance(text)` — same text, same queue, no user-visible failure mode (aside from a lower-fidelity voice).

**Voice parameter tuning (pitch, rate per personality)**: `useVoiceCoachFallback.getVoiceSettings()` assigns distinct pitch/rate combinations so each persona is still recognizably different even on the browser's built-in voice:

| Personality | pitch | rate |
|---|---|---|
| motivational | 1.2 (higher/brighter) | 1.05 |
| analytical | 0.95 (slightly lower) | 1.10 (fastest, clipped/efficient) |
| drill_sergeant | 0.8 (lowest/deepest) | 1.15 (fastest, urgent) |

**Queue system for sequential utterances**: both the ElevenLabs path (`useVoiceCoach`) and the fallback-only hook (`useVoiceCoachFallback`) maintain a `string[]` queue plus an `isPlayingRef`/`isSpeakingRef` boolean guard. New coaching lines are pushed onto the queue; a `drainQueue`/`processQueue` function only starts the next utterance once the previous one's `onend`/`onerror` fires, ensuring the coach never talks over itself even if two triggers fire in quick succession (e.g., a milestone and an interval check-in landing in the same stats tick — though in practice `checkTriggers` only ever returns one trigger per call, the queue is still the safety net against overlapping playback of asynchronous ElevenLabs responses that could resolve out of order).

---

## 5. Real-Time Mapping

### MapLibre GL

Both map components (`RunMap.tsx` for the live in-run view, `RouteMap.tsx` for the post-run history view) use `react-map-gl/maplibre` (MapLibre GL JS under the hood) rather than Mapbox GL JS.

**Why MapLibre over Mapbox**: MapLibre is the open-source, BSD-licensed fork of Mapbox GL JS (created after Mapbox moved to a proprietary license at v2). It exposes essentially the same imperative API (`Map`, `Source`, `Layer`, `Marker`, `fitBounds`, `easeTo`, etc.), so the app gets the same rendering performance and API ergonomics as Mapbox without needing a Mapbox access token or being subject to Mapbox's usage-based pricing — a meaningful concern for a hobby/portfolio project that might get a traffic spike.

**CARTO Dark Matter tiles (free, no key)**: `MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"` — CARTO publishes a set of free, no-API-key-required basemap styles (Dark Matter, Positron, Voyager). Dark Matter was chosen for aesthetic reasons (a dark map reads well against the app's bright accent color used for the route line, `#CFFF04`) and because, like MapLibre itself, it requires zero API key management or billing setup.

**GeoJSON LineString for route rendering**: both map components build a `FeatureCollection` containing a single `LineString` feature whose `coordinates` array is `positions.map(p => [p.longitude, p.latitude])` (GeoJSON is `[lng, lat]` order, the opposite of the `{latitude, longitude}` object shape used everywhere else in the app — an easy source of bugs if not handled consistently). This is fed to a MapLibre `<Source type="geojson">` + `<Layer type="line">`, which is the standard, GPU-efficient way to render a path of arbitrary length without manually drawing individual line segments.

**Viewport management (follow mode vs fit bounds)**:
- **Live/"follow" mode** (`RunMap`, `isLive=true`): on every new position, `map.easeTo({ center: [lng, lat], duration: 300 })` smoothly recenters the camera on the runner's current position — appropriate mid-run, where the runner cares about "where am I now," not the whole route shape.
- **Static/"fit bounds" mode** (`RunMap` post-run, and always in `RouteMap`): `map.fitBounds([minLng, minLat, maxLng, maxLat], { padding: 48, maxZoom: 16 })` computes the bounding box of every recorded point and zooms/pans so the entire route is visible at once — appropriate for reviewing a completed run.
- `RouteMap` additionally disables all user interaction (`dragPan={false}`, `scrollZoom={false}`, etc.) since it's a small, non-interactive thumbnail-style summary map rather than an explorable one.

### Route Visualization

**Polyline rendering**: the `line-color`/`line-width`/`line-opacity` paint properties are set per-layer (`#CFFF04`, width 4 for the live map, width 3/opacity 0.85 for the static history map — subtly thinner since it's often shown smaller).

**Live position marker with animation**: `RunMap` renders a `<Marker>` at the latest position containing two stacked absolutely-positioned `<span>`s — an outer ring with Tailwind's `animate-ping` (a CSS keyframe that scales up and fades out on loop, creating a radar-style pulse) and an inner solid dot — the classic "live GPS blip" visual pattern, built with pure CSS rather than a JS animation loop.

**Split markers placement**: `RouteMap` accepts an optional `splits: SplitMarker[]` prop (each with `splitNumber`, `latitude`, `longitude` — the GPS coordinate where that split completed) and renders a small numbered white circle marker at each, plus a white "start" marker and a red "finish" marker derived from `positions[0]` and `positions[positions.length - 1]`.

---

## 6. Analytics & Predictions

### Riegel Formula (Race Time Prediction)

```
T2 = T1 × (D2 / D1)^1.06
```

Implemented in two places with the same math: `predictRaceTime()` in `lib/running-analysis.ts` (used for a quick single-target prediction) and `riegelPredict()` in `/api/analytics/race-predictor/route.ts` (used to project 5K/10K/half/full marathon times from a single best recent effort).

**What it means**: Peter Riegel's 1977 formula predicts the finish time `T2` for a target race distance `D2` given a known, already-run time `T1` over a reference distance `D1`. It captures the empirical observation that runners don't hold the same *pace* across all distances — everyone slows down (in pace-per-km terms) as distance increases, due to accumulating fatigue, fueling/hydration limits, and pacing strategy differences between short, fast efforts and long, endurance efforts.

**The 1.06 exponent (fatigue factor)**: if runners paced every distance identically, the exponent would be `1.0` (time scales linearly with distance). The empirically-fit exponent of `1.06` means predicted time grows *slightly faster* than distance — e.g., doubling distance more than doubles predicted time, capturing the realistic expectation that a marathon pace is meaningfully slower than a 10K pace, which is itself slower than a 5K pace, for the same runner. This app's implementation actually anchors the "reference" run to whichever completed run in the last 90 days (≥3km) had the *fastest* average pace (`bestRun` in `race-predictor/route.ts`), reasoning that a runner's best recent effort is the most informative signal of current fitness for extrapolating to other distances.

**Limitations and when it breaks down**:
- Riegel is a pure statistical curve fit, not a physiological model — it has no awareness of training history, terrain, weather, or race-day tapering, all of which materially affect real race outcomes.
- It's most accurate when `D2` is reasonably close to `D1` (e.g., predicting a 10K time from a 5K time) and becomes progressively less reliable extrapolating across very different distance regimes (e.g., predicting a marathon from a 1-mile time) — this app mitigates that somewhat by requiring the reference run be ≥3km, but still projects up to marathon distance from potentially much shorter reference efforts.
- It assumes the reference performance was itself close to a "true" maximal effort for that distance; an easy training run used as the reference will under-predict what the runner is actually capable of.
- No formula-level bound exists on prediction error for very short (<1500m) or ultra-distance (>marathon) extrapolations — this app doesn't attempt either, capping targets at marathon distance.

### Pace Variability Analysis

`analyzePaceVariability(splits)` in `lib/running-analysis.ts` computes the **coefficient of variation** across a run's per-split average paces:

```
variabilityPercent = (stdDev / mean) × 100
```

Step by step: (1) compute the mean of all split paces; (2) compute variance as the mean of squared deviations from that mean; (3) take the square root to get standard deviation (same units as pace, seconds/km); (4) divide by the mean and multiply by 100 to express the spread as a *percentage of the average*, which (unlike raw standard deviation) is comparable across runners of different absolute speeds — a 20 sec/km standard deviation means very different things for a 4:00/km runner versus an 8:00/km runner, but the coefficient of variation normalizes that away.

**Even pacing vs positive/negative split**: separately from the variability score, the function also compares the *first-half* average split pace to the *second-half* average split pace:
- If the two halves differ by less than 3% of the overall mean pace → **"even"** pacing.
- If the second half is *slower* (higher seconds/km) → **"positive split"** (runner faded).
- If the second half is *faster* → **"negative split"** (runner finished stronger — generally regarded as good pacing discipline in distance running).

**Threshold: CV > 10% = inconsistent**. Above 10% variability, the function returns a generic "your pace varies a lot" suggestion regardless of split trend, since a highly erratic pace pattern (as opposed to a smooth positive or negative split) usually indicates external disruption (traffic lights, hills, GPS noise in the split boundaries themselves) rather than a coherent pacing *strategy* worth commenting on specifically.

### Recovery Estimation

`estimateRecoveryNeeded(lastRun)` in `lib/running-analysis.ts` buckets the most recent run into one of three intensity tiers using both distance and pace as signals (either one alone triggering the higher tier):

- **Hard** → distance > 10 km **or** avg pace faster than 300 s/km (5:00/km) → **48 hours** recovery.
- **Moderate** → distance > 6 km **or** avg pace faster than 390 s/km (6:30/km) → **24 hours** recovery.
- **Easy** → everything else → **12 hours** recovery.

The 300 s/km and 390 s/km thresholds are rough tempo/easy-pace boundaries: sub-5:00/km is a genuinely fast effort for most recreational runners (tempo/threshold territory), while sub-6:30/km still represents a moderate, sustained effort rather than a relaxed jog. Distance is evaluated independently because a *long, slow* run (e.g., 12km easy) still accumulates significant muscular fatigue even without a fast pace — hence the "OR" rather than "AND" logic.

**How this feeds into AI recommendations**: `/api/coaching/recovery/route.ts` calls `estimateRecoveryNeeded`, and — if `GROQ_API_KEY` is configured — passes the resulting `intensity`/`recoveryHours` plus a formatted summary of the last run into `generateRecoveryAdvice()`, which asks the LLM for one to two sentences of natural-language guidance ("specific about pace guidelines or activity type"). If no Groq key is present, the route falls back to the static `recovery.suggestion` string computed purely from the bucket logic — so the feature degrades gracefully rather than failing outright. The route also computes a concrete `suggestedPace` (last run's avg pace + 90s for hard-recovery days, +60s for moderate) to give the runner an actionable easy-day pace target, not just a vague "take it easy."

### Streak Calculation

`calculateStreak(runs)` in `lib/achievements.ts`:

**Algorithm**: (1) collect the set of unique *calendar days* (not run count — multiple runs on one day count once) that have at least one run, using a `YYYY-MM-DD` string key derived from each run's local `Date`; (2) sort those day-keys ascending; (3) walk the sorted list computing the day-to-day gap in whole days (`diffDays = round((curr - prev) / 86400000)`) — a gap of exactly 1 extends the running streak counter and updates `maxStreak` if it's a new high; any gap greater than 1 resets the running counter to 1; (4) separately compute the *current* streak by checking whether the most recent active day is today or yesterday (a streak that ended two or more days ago is considered broken, contributing to `maxStreak` history but reporting `current: 0`), then walking backward from the most recent day counting consecutive 1-day gaps.

**Edge cases**:
- **Timezone handling**: day keys are derived via `new Date(run.startedAt)` and its local `getFullYear()/getMonth()/getDate()` — i.e., calendar days are bucketed in the *browser/server's local timezone* at the time the code runs, not the timezone the run actually took place in. This is a known simplification: a run logged just before midnight and another just after, in a timezone-naive sense, could be miscounted as either the same or different days depending on where the calculation is evaluated, since `startedAt` is stored as an absolute UTC instant in Postgres (`DateTime`) with no separate stored timezone offset.
- **Multiple runs per day**: handled correctly by design — the `Set<string>` of day-keys de-duplicates same-day runs automatically, so running twice today doesn't count as "two days" of streak.
- **"Today" boundary**: because the current streak requires the *last active day* to be today or yesterday, a runner who ran every day for a month but skipped today (so far) still shows their streak as alive (in case they still run later today) rather than prematurely reporting it broken at, e.g., 9am before they've had a chance to run.

---

## 7. Authentication (NextAuth v5)

`src/lib/auth.ts` configures NextAuth (v5 beta, package `next-auth@5.0.0-beta.31`) with two providers:

- **CredentialsProvider**: `authorize()` looks up `prisma.user.findUnique({ where: { email } })`, and if a `passwordHash` exists, compares the submitted password with `bcrypt.compare(password, passwordHash)` (via `bcryptjs`, a pure-JS bcrypt implementation with no native-binary compile step — simpler deployment at a slight performance cost versus the native `bcrypt` package). Returns `null` (rejecting sign-in) for any missing user, missing hash, or failed comparison — deliberately not distinguishing "no such user" from "wrong password" in the response, to avoid leaking account existence.
- **GitHubProvider**: standard OAuth via `GITHUB_ID`/`GITHUB_SECRET` env vars, giving users a password-less sign-in option.

**JWT session strategy**: `session: { strategy: "jwt" }` — rather than persisting server-side session rows for every login (the `Session` model in `schema.prisma` exists for adapter compatibility but isn't the active strategy here), the session state is encoded into a signed JWT stored client-side in a cookie. The `jwt()` callback copies `user.id` onto the token at sign-in; the `session()` callback copies it back onto `session.user.id` on every session read — this round-trip is necessary because NextAuth's default `User` type doesn't automatically expose a custom `id` field on the session object without this explicit wiring.

**Session token in cookies**: the JWT lives in a cookie named `authjs.session-token` (or `__Secure-authjs.session-token` over HTTPS) — NextAuth v5 sets this automatically; the app's own route-protection logic (see below) reads this cookie directly rather than calling `auth()` again, since edge middleware/proxy contexts want a cheap, synchronous check rather than a full session decrypt-and-validate round trip.

**Route protection via `proxy.ts`**: `src/proxy.ts` exports a Next.js middleware-equivalent (`proxy`) function matched against `/dashboard/:path*`, `/run/:path*`, `/history/:path*`, `/settings/:path*` (declared in `export const config = { matcher: [...] }`). For any matched path, it checks for the presence of the session cookie; if absent, it redirects to `/login?callbackUrl=<original path>` so the user lands back where they intended after signing in. `/api/auth/*` routes are explicitly excluded from this check (NextAuth needs to handle its own auth flow requests unauthenticated). This is a *presence* check only (cookie exists) for fast-path redirection — actual session **validation** (signature check, expiry, user lookup) happens per-request inside each API route handler via `await auth()`, which is the authoritative check; `proxy.ts` is a UX optimization to avoid rendering a protected page shell before redirecting, not the security boundary itself.

---

## 8. Database Design (Prisma + PostgreSQL)

### Schema decisions and relationships

- **`User`** — core identity; has one `UserPreferences`, many `Run`s, many `CoachingSession`s, plus NextAuth's `Account[]`/`Session[]` for OAuth/session-adapter support.
- **`UserPreferences`** — split into its own 1:1 model (rather than columns on `User`) so user-facing settings (`preferredCoach`, `distanceUnit`, `voiceEnabled`, `feedbackFrequency`) are logically separate from identity/auth fields, and so this table can evolve independently (e.g., added later, optional) without migrating the `User` table itself.
- **`Run`** — one row per run, storing **denormalized aggregates** (`totalDistanceM`, `totalDurationS`, `avgPaceSPerKm`, `maxPaceSPerKm`, `elevationGainM`, `caloriesEst`) rather than requiring every read (history list, analytics dashboard) to re-aggregate potentially thousands of `RunPoint` rows on the fly. These aggregates are computed client-side during/after the run and written once via the `PATCH /api/runs/[runId]` finalize call.
- **`RunPoint`** — the raw GPS trace, one row per accepted GPS fix (see §2 filtering) — see below for why this is a separate table.
- **`RunSplit`** — one row per completed distance split (km or mile), each with its own `durationS`/`avgPaceSPerKm`, enabling the pace-variability analysis (§6) and split-by-split UI without re-deriving splits from raw points every time.
- **`CoachingSession`** — 1:1 with `Run` (a `@unique` foreign key), holding the chosen `personality` and an optional `vapiCallId` field (present for a previously-considered/partial Vapi voice-agent integration path — not the primary TTS flow, which uses the direct Groq+ElevenLabs pipeline described in §3/§4). Has many `CoachingFeedback` rows.
- **`CoachingFeedback`** — an append-only log of every coaching line actually delivered during a run (`triggerType`, `message`, optional `context` JSON-as-string), useful for later analysis of what the AI said and when, and for potential future features like "show me everything the coach said during this run."

### Indexing strategy (userId + startedAt composite index)

`Run` has `@@index([userId, startedAt])` — the two dominant query patterns are "all of this user's runs" (history list, analytics) and "all of this user's runs ordered/filtered by date" (period-based analytics like `7d`/`30d`/`90d` windows, streak calculation). A composite index with `userId` first lets Postgres efficiently narrow to one user's rows via an index seek, then use the trailing `startedAt` column for range scans/`ORDER BY` without a separate sort step — exactly the shape of every query seen in `/api/runs`, `/api/analytics`, and `/api/analytics/race-predictor`. Similarly, `RunPoint` has `@@index([runId, timestamp])` (fetching one run's points in chronological order) and `RunSplit` has `@@index([runId, splitNumber])` (fetching one run's splits in order), and `CoachingSession` has `@@index([userId, startedAt])` for the same "this user's sessions over time" access pattern.

### Why RunPoint is separate from Run (thousands of points per run)

A single hour-long run, sampled roughly once per second (before filtering) to once every few seconds (after accuracy/jitter filtering), can easily produce several hundred to a few thousand GPS fixes. Storing that as a JSON blob column on `Run` would work for *reading* the whole trace back, but would be poor for: (1) **incremental writes** — the batch-upload strategy (§2) needs to `INSERT` new points every 10 seconds without rewriting an ever-growing JSON blob on every flush; (2) **partial queries** — a feature that needs "just the last 100 points" or "points between timestamp X and Y" can use normal `WHERE`/`LIMIT` SQL against rows, versus deserializing an entire blob into memory; (3) **row-level indexing** — the `[runId, timestamp]` index lets Postgres efficiently return a run's trace pre-sorted; a JSON column offers no equivalent. The relational model does cost more storage overhead per point (row overhead, foreign key) than a packed blob/array would, but for a use case dominated by "append points during the run, read the whole trace back once for the map," normalized rows are the simpler and more flexible choice, especially given Postgres's efficient `createMany` batch insert path.

### Migration strategy

The project uses `prisma migrate` conventions (`prisma/schema.prisma` as the single source of truth, `prisma.config.ts` for CLI configuration) with the `prisma-client-js` generator and a `postgresql` datasource — schema changes are expressed as versioned migration files generated by the Prisma CLI (`prisma migrate dev` locally, `prisma migrate deploy` in production), rather than hand-written SQL, keeping the schema and the generated TypeScript client in lockstep. `@prisma/adapter-pg` is used as the driver adapter, indicating the project targets Prisma's newer driver-adapter architecture (decoupling the query engine from a specific native binary per platform) rather than the legacy Rust-engine-only setup.

---

## 9. PWA & Offline

### Service worker strategy (network-first for API, cache-first for assets)

`public/sw.js` implements a hand-written service worker (no Workbox) with two distinct modes:

- **Localhost self-unregister**: if `location.hostname` is `localhost`/`127.0.0.1`, the SW immediately unregisters itself and clears all caches on `activate`, then force-navigates open clients — this exists purely so a stale cached service worker never interferes with Next.js's dev-mode hot module reloading (a classic footgun where a previously-installed production SW silently serves cached dev assets).
- **Production behavior**: on `install`, precaches a small fixed list of shell routes (`/dashboard`, `/run`, `/history`) into a versioned cache (`runcoach-v2` — the version suffix is bumped manually to force cache invalidation on deploys that change cached content). On `fetch`:
  - Any `/api/` request → **network-first**: try `fetch()`, fall back to cache only on failure. This is correct for API calls because coaching text, run data, and analytics must be fresh — a cached API response would show stale (or even a different user's, if caching isn't scoped carefully) data; the cache fallback exists purely as a "something is better than a hard error" safety net for a truly offline moment, not as a primary strategy.
  - Navigation requests (HTML page loads) → also **network-first** with cache fallback, so users get the latest deployed page when online but the app shell still loads (from precache) if they open the PWA with no connectivity.
  - Everything else (JS/CSS/image assets) → **cache-first**: check cache, only hit the network on a cache miss. Static build assets are content-hashed by Next.js, so a cache-first strategy is safe (a given hashed filename's content never changes) and avoids unnecessary network requests for assets that rarely change between visits.

### Wake Lock API for screen-on during runs

`useWakeLock(active)` in `src/hooks/useWakeLock.ts` requests a `"screen"` wake lock via `navigator.wakeLock.request("screen")` whenever `active` is true (wired to `status === "active"` in the run page), preventing the phone from auto-locking/dimming mid-run — critical for a feature the runner needs to glance at (live stats, map) without constantly re-waking their phone. It also re-acquires the lock on `visibilitychange` if the tab regains visibility (the OS/browser force-releases wake locks when a tab is backgrounded, e.g., screen off or app-switch, so simply "requesting once" isn't sufficient — the hook must re-request every time the page becomes visible again). Errors (e.g., low-battery mode denying the request) are caught and silently reflected in `isActive: false` rather than throwing, since a denied wake lock should degrade gracefully, not break the run.

### Manifest for Add to Home Screen

`src/app/manifest.ts` uses Next.js's typed `MetadataRoute.Manifest` export to generate `/manifest.webmanifest` (or `/manifest.json`, depending on Next's convention) declaring `name: "RunCoach AI"`, `short_name: "RunCoach"`, `start_url: "/dashboard"` (so launching from the home screen icon goes straight to the dashboard rather than the marketing landing page), `display: "standalone"` (hides browser chrome, making it feel like a native app), a black theme/background color matching the app's dark aesthetic, and SVG icons at 192x192/512x512 (SVG rather than PNG — infinitely scalable, smaller file size, no need to ship multiple raster resolutions).

---

## 10. Performance Considerations

- **GPS batch upload (reduce network calls)**: as detailed in §2, points are buffered client-side and flushed every 10 seconds (plus once on stop) rather than per-fix, cutting network round-trips roughly 10x versus a naive "send every point immediately" approach, and giving natural resilience to brief connectivity gaps.
- **Zustand for client state (no unnecessary re-renders)**: `src/stores/run-store.ts` uses Zustand rather than React Context/`useState` lifted to a top-level component specifically because Zustand's `create()` store lets components subscribe to only the *slice* of state they read (via selector functions), so a component reading only `stats.distanceMeters` doesn't re-render when, say, `positions` grows — important here because `positions` can grow into the thousands over a long run, and naively re-rendering every consumer on every GPS tick would be wasteful. (Note: much of the live run page still uses local hook state — `useRunSession` — rather than this store directly for the active-run flow; the store is the shared cross-component state mechanism for pieces like coach personality selection.)
- **Lazy loading maps (heavy component)**: MapLibre GL is a substantial dependency (WebGL rendering engine, tile-fetching, style parsing) that only needs to run on pages that actually show a map (`/run/active`, run history detail) — keeping it out of the initial bundle for lighter pages (dashboard, settings, auth) via Next.js's code-splitting per route (and, where used, dynamic `import()`/`next/dynamic`) avoids penalizing every page load with map-rendering JS that most page views never touch.
- **LLM response caching potential**: currently, every coaching trigger is a fresh Groq API call with no caching layer — a reasonable future optimization would be to cache responses for *semantically* similar contexts (e.g., near-identical trigger + stats buckets), but coaching text is intentionally context-specific (exact current pace/distance/time) and personality-varied by design (temperature 0.8), so naive caching would either miss almost every time (context is rarely byte-identical) or produce stale-feeling, repetitive coaching if over-aggressively bucketed — this is a deliberate trade-off favoring response freshness/variety over latency/cost savings, acceptable given Groq's already-low inherent latency.
