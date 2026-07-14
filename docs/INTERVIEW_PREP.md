# Interview Preparation — RunCoach AI

Companion to `TECHNICAL_DEEP_DIVE.md`. Read that document first — every answer below assumes familiarity with the formulas and file paths described there.

## Quick Pitch (30 seconds)

"I built a full-stack AI running coach that provides real-time voice feedback during runs. It tracks your GPS, analyzes your pace, and an LLM generates contextual coaching that's spoken through neural TTS — adapting to 3 different coaching personalities. The entire AI stack is free: Groq for LLM, ElevenLabs for voice."

Optional one-sentence follow-up if they want more: "Under the hood it's Next.js with a Postgres/Prisma backend, MapLibre for live route rendering, and a rules-based trigger system that decides *when* the coach should speak, so the LLM is only ever generating short, context-specific bursts rather than an open-ended conversation."

---

## Common Questions & Strong Answers

### Architecture & Design

**1. "Walk me through the system architecture."**
Answer: The browser's Geolocation API feeds raw position updates into a filtering/smoothing layer (`useGeolocation` → `useRunSession`), which computes distance via the Haversine formula and pace via a 30-second rolling window. Those stats flow into two consumers: a MapLibre map for live visualization, and a trigger-checking system that decides when the AI coach should speak. When a trigger fires, the client calls a Next.js API route that builds a prompt from the runner's live stats plus their last completed run (fetched from Postgres via Prisma), sends it to Groq's Llama 3.3 70B, and returns text that's spoken via ElevenLabs (with a Web Speech API fallback). GPS points are batched and flushed to the database every 10 seconds rather than per-fix.
Follow-up they might ask: "What's stateful on the client vs. the server?" — Key term: **trigger-based event architecture** (as opposed to a continuous conversational agent).

**2. "Why did you choose this tech stack?"**
Answer: Next.js App Router gives me server-rendered pages and API routes in one codebase, which matters for a solo project where I want to minimize deployment surface area. Groq was chosen specifically for latency — it runs Llama 3.3 70B on custom LPU hardware rather than GPUs, giving roughly 150-250ms full-response latency, which matters when a runner expects near-instant feedback mid-stride. ElevenLabs for TTS quality, with a Web Speech fallback so the app never goes fully silent if that API key isn't configured. MapLibre over Mapbox because it's the open-source fork with no token/billing requirement, paired with CARTO's free Dark Matter tiles.
Follow-up: "What would break this stack at scale?" — Key term: **LPU inference** (Groq's differentiator vs. GPU-hosted LLMs).

**3. "How does data flow from GPS to voice output?"**
Answer: Geolocation fix → accuracy/jitter/speed filters (discard bad points) → Haversine distance summed into total distance and a 30-second windowed pace → stats snapshot compared against the previous snapshot by `checkTriggers()` → if a trigger fires, a POST to `/api/coaching/generate` with the trigger type and formatted stats → Groq generates a short response using the personality's system prompt → the client tries ElevenLabs TTS first, Web Speech API second → audio plays through a sequential queue so multiple coaching lines never overlap.
Follow-up: "What happens if two triggers fire in the same tick?" — Key term: **priority-ordered trigger evaluation** (checkTriggers returns the first match, not all matches).

**4. "What's the most complex part of the system?"**
Answer: Getting the trigger system's thresholds right was harder than the LLM integration itself — anyone can call an LLM API, but deciding *when* to interrupt a runner with coaching, without being either silent for too long or naggy, required tuning asymmetric thresholds (15% pace drop vs. 10% pace increase) and a priority order (discrete events like splits/milestones before continuous signals like pace, with a 2-minute interval fallback) so the coaching feels responsive without being noisy.
Follow-up: "How would you validate those thresholds are actually good?" — Key term: **asymmetric thresholds** (different bars for negative vs. positive feedback).

**5. "How would you scale this to 10,000 users?"**
Answer: The heaviest per-user cost is the GPS point volume — I'd look at whether raw point storage needs to persist indefinitely, or if I can downsample old runs' point traces once they're no longer being actively viewed. On the API side, Groq and ElevenLabs are both usage-metered externally, so cost — not latency — becomes the constraint; I'd add response caching for non-live paths (post-run analysis, training plans) since those aren't time-critical, while keeping the live coaching path uncached since context is unique per trigger. Database-wise, the existing `[userId, startedAt]` composite indexes already support the dominant query patterns, but I'd add read replicas for the analytics aggregation queries before touching the write path.
Follow-up: "Where's the first bottleneck you'd actually measure?" — Key term: **read/write query separation**.

### Technical Deep-Dive

**6. "Explain how GPS tracking works in a browser."**
Answer: `navigator.geolocation.watchPosition()` gives a continuous stream of position callbacks, each with lat/lon, an accuracy radius in meters, optional speed/heading, and a timestamp. My `useGeolocation` hook wraps this and applies three filters before accepting a point: discard if accuracy is 30m or worse (usually a network/cell-tower fallback fix, not a real GPS lock), discard if it's less than 3m from the previous accepted point (stationary GPS jitter), and discard if implied speed exceeds 12 m/s (physically impossible for a runner, usually a GPS glitch). Only points that pass all three get pushed into the array that drives distance/pace calculations.
Follow-up: "Why watchPosition instead of polling getCurrentPosition on an interval?" — Key term: **accuracy radius** (the 68% confidence circle a browser reports).

**7. "How does the Haversine formula work?"**
Answer: It computes great-circle distance between two lat/lon points assuming a spherical Earth. You convert both points' lat/lon to radians, compute the differences, then `a = sin²(Δlat/2) + cos(lat1)·cos(lat2)·sin²(Δlon/2)` — that cosine term is what accounts for longitude lines converging near the poles. Then `c = 2·atan2(√a, √(1-a))` gives the central angle, and multiplying by Earth's radius (6,371,000m) converts that angle to a linear distance. I chose it over Vincenty's more accurate ellipsoidal formula because Vincenty is iterative and computationally heavier, and the error difference (under 0.5%) is negligible compared to consumer GPS receiver noise, which is the actual dominant error source here.
Follow-up: "Why atan2 instead of a simpler inverse sine?" — Key term: **great-circle distance** / atan2's numerical stability at small angles.

**8. "Why batch GPS points instead of sending one at a time?"**
Answer: Three reasons. First, network efficiency — sending a request per GPS fix (roughly once a second) is 10x more HTTP round-trips than a 10-second batch, each with its own overhead. Second, resilience — GPS-heavy usage is almost always outdoors with imperfect connectivity, so a batch that fails to send just stays in a "pending" cursor and gets retried whole on the next interval, which is a much simpler retry model than tracking per-point send state. Third, battery and radio usage — waking the network radio every second for a multi-kilometer run adds up.
Follow-up: "What happens if the app crashes between flushes?" — Key term: **idempotent-by-construction retry** (the unflushed cursor doesn't advance until success).

**9. "How do you handle GPS noise and jitter?"**
Answer: Two layers. At ingestion, I filter out points with poor accuracy, implausible speed, or that are within 3 meters of the last accepted point (raw jitter suppression). Then, for pace specifically, I don't use instantaneous point-to-point pace at all — I compute pace over a rolling 30-second window of accepted points, which smooths out the noise that's still present even in "good" fixes, while staying responsive enough to reflect a genuine pace change within about half a minute.
Follow-up: "Why 30 seconds and not, say, 10 or 60?" — Key term: **rolling window smoothing**.

**10. "Explain your LLM prompt engineering approach."**
Answer: I split responsibility between two layers. Each of the three personalities has a static system prompt that defines *how* to speak — tone, vocabulary, response pattern — but never contains live data, since it can't. Runtime data — current pace, distance, elapsed time, split number, weather — gets formatted into a plain-English context string per-request and sent as the user turn, along with an explicit trigger label like `[Trigger: pace_drop]`. Both the system prompt and the per-request instruction independently enforce a length constraint (under ~40 words / 15 seconds of speech), which is a deliberate double-constraint since I don't want the model ever generating something too long to be a natural spoken interjection.
Follow-up: "How do you keep the personality consistent across different trigger types?" — Key term: **separation of persona (system prompt) from context (user turn)**.

**11. "How do you keep voice latency low?"**
Answer: A few compounding choices: Groq itself is low-latency (LPU hardware, ~200ms for a short completion), the response text is capped short (fewer output tokens to generate, and less text for ElevenLabs to synthesize), and the speak API route fails fast — returning a 503 immediately if no ElevenLabs key is configured — rather than the client waiting out a timeout before falling back to Web Speech. The TTS itself is not streamed in this implementation; it's request-response buffered, so there's a tradeoff there I'd address if latency became an issue — ElevenLabs does support streaming synthesis.
Follow-up: "What would streaming TTS actually save you here, precisely?" — Key term: **buffered vs. streamed synthesis** (be ready to admit this is a known limitation, not a solved problem).

**12. "What happens when the user backgrounds the app?"**
Answer: The Wake Lock API keeps the screen on while a run is active specifically to reduce how often this happens, but browsers/OSes can still force-release a wake lock (e.g., if the tab is truly backgrounded, not just screen-dimmed) — my `useWakeLock` hook listens for the lock's own `release` event and for the page's `visibilitychange` event, and re-requests the lock automatically when the page becomes visible again. GPS tracking itself, via `watchPosition`, is subject to whatever throttling the browser applies to backgrounded tabs — that's a browser-level constraint I don't fully control from JS.
Follow-up: "How would you handle a genuinely backgrounded/killed tab, like on iOS Safari?" — Key term: **Wake Lock API** and its `visibilitychange` re-acquisition requirement (be honest this is a real, known weak point on mobile Safari).

**13. "How does the trigger system decide when to coach?"**
Answer: `checkTriggers()` runs on every stats update and checks five conditions in a fixed priority order, returning the first match: split completion, distance milestone, pace drop >15% vs. average, pace improvement >10% vs. average, then a catch-all 2-minute interval check-in if nothing else fired. Discrete events (splits, milestones) are checked first because they're time-critical and rare; pace deviations next since they represent an ongoing state worth flagging; the interval trigger is last and gated by a cooldown so it acts purely as a fallback cadence, never preempting something more specific.
Follow-up: "Why is the pace-drop threshold higher than the pace-improvement threshold?" — Key term: **priority-ordered, threshold-gated trigger evaluation**.

### Database & Backend

**14. "Why PostgreSQL over MongoDB for this?"**
Answer: The data is inherently relational — a `User` has many `Run`s, each `Run` has many `RunPoint`s and `RunSplit`s, and the dominant queries (this user's runs in a date range, this run's points in timestamp order) are exactly what composite B-tree indexes are built for. I also get transactional guarantees for free when finalizing a run (writing aggregates) and strong consistency for auth-adjacent tables. A document store doesn't buy me much here since I'm not storing deeply nested, schema-flexible documents — every entity has a well-defined, stable shape.
Follow-up: "Would a time-series database be a better fit for RunPoint specifically?" — Key term: **relational normalization vs. document flexibility** (a fair follow-up is that a time-series DB like TimescaleDB could be a legitimate upgrade for RunPoint at scale).

**15. "Explain your database schema design."**
Answer: `User` owns `UserPreferences` (1:1, split out so settings evolve independently of identity), and many `Run`s. Each `Run` stores denormalized aggregate stats (total distance, duration, avg pace) computed once at finalize-time, rather than requiring every history/analytics read to re-aggregate potentially thousands of raw points. The raw GPS trace lives in a separate `RunPoint` table (one row per accepted fix) specifically so incremental batch writes during a run don't require rewriting a growing blob, and so I get index-backed range queries. `RunSplit` holds one row per completed distance split for pace-variability analysis. `CoachingSession`/`CoachingFeedback` log what the AI actually said and when, for potential future features like a full run transcript.
Follow-up: "Why not store the GPS trace as a JSON array column?" — Key term: **denormalized aggregates + normalized detail rows**.

**16. "How do you handle concurrent GPS point writes?"**
Answer: Honestly, this app doesn't need heavy concurrency control here — each run belongs to exactly one user and one active client session, so there's no realistic scenario of two writers racing on the same run's points. The batch endpoint uses `createMany`, which is a single INSERT statement for the whole batch, avoiding N separate round-trips and any need for row-level locking beyond what Postgres does by default for inserts. If I ever supported, say, a paired/group-run feature with multiple simultaneous point streams into one run, that assumption would need revisiting.
Follow-up: "What if the same batch gets flushed twice due to a client retry bug?" — Key term: **createMany batch insert** (be honest: there's no uniqueness constraint currently preventing duplicate point rows — a real gap, discussed under Limitations).

**17. "What's your authentication strategy?"**
Answer: NextAuth v5 with two providers — credentials (email/password, bcrypt-hashed, compared via `bcrypt.compare`) and GitHub OAuth. Sessions use the JWT strategy, so session state is a signed cookie rather than a server-side session table lookup on every request — I do have the `Session` model in the schema for adapter compatibility, but it's not the active strategy. Route protection happens at two levels: a lightweight cookie-presence check in `proxy.ts` for fast UX-level redirects to `/login`, and the authoritative `await auth()` check inside every actual API route handler, which does the real signature/expiry validation.
Follow-up: "Why JWT sessions over database sessions?" — Key term: **JWT strategy vs. database session strategy** — JWT avoids a DB round-trip per request at the cost of harder immediate revocation.

### Frontend & UX

**18. "How do you render real-time maps performantly?"**
Answer: MapLibre GL renders via WebGL, so the route polyline is a GPU-rendered line layer fed by a GeoJSON `LineString` source, not individually drawn DOM elements — that scales to long routes with thousands of points without per-point render cost. In live mode, I use `easeTo()` to smoothly recenter the camera on the runner's latest position; in review mode, I compute a bounding box across all points once and call `fitBounds()` so the whole route is framed on load, and I disable pan/zoom interaction entirely on the small history thumbnail map since it's not meant to be explored.
Follow-up: "What would you do if a run had 50,000 points and rendering got slow?" — Key term: **GPU-rendered vector line layer**.

**19. "How did you handle the mobile-first design?"**
Answer: The active-run screen is a fixed full-viewport layout with large touch targets for start/pause/stop, a Wake Lock to keep the screen on, and a PWA manifest with `display: standalone` so it launches without browser chrome when added to the home screen. Since it's meant to be glanced at mid-run, not read closely, the stat typography is intentionally oversized.
Follow-up: "How would you test this across different device form factors?" — Key term: **standalone display mode**.

**20. "What's your state management approach?"**
Answer: Mostly local component/hook state (`useRunSession`, `useGeolocation`) for the active-run flow, since that state genuinely only matters to that page, plus a Zustand store for state that needs to be shared more broadly, like coach personality selection. I chose Zustand over lifting everything into React Context because Zustand lets components subscribe to just the slice of state they read, which matters when the positions array can grow into the thousands over a long run — a naive Context setup would re-render every consumer on every GPS tick.
Follow-up: "Why not just put all of it in Zustand?" — Key term: **selector-based subscription** (avoiding unnecessary re-renders).

**21. "How does the PWA work?"**
Answer: A hand-written service worker (`public/sw.js`, no Workbox) with a network-first strategy for API calls and navigations — always prefer fresh data, fall back to cache only if the network fails — and a cache-first strategy for static, content-hashed assets, which is safe because their filenames change whenever their content does. There's also a dev-mode branch: on localhost, the service worker immediately unregisters and clears its own caches, specifically to avoid a stale SW interfering with Next.js hot reloading.
Follow-up: "Why network-first for navigations instead of cache-first for an 'app shell' pattern?" — Key term: **network-first vs. cache-first strategy**, chosen per request type based on freshness needs.

### AI & ML

**22. "Why Groq/Llama instead of OpenAI?"**
Answer: Latency and cost. Groq runs open-weight models like Llama 3.3 70B on purpose-built LPU hardware, which gives roughly 150-250ms latency for a short completion — noticeably faster than typical GPU-hosted inference at a comparable model size, and latency matters directly here since a runner is waiting mid-run for a spoken response. Groq's free tier also keeps the project's "the entire AI stack is free" story true. Llama 3.3 70B itself is a strong instruction-follower — good at obeying strict constraints like word limits and persona consistency, which is really the main quality bar for short, templated coaching lines rather than open-ended conversation.
Follow-up: "What would you lose moving to a smaller/faster model, or gain moving to a larger one?" — Key term: **LPU vs. GPU inference latency**.

**23. "How do you engineer the coaching personalities?"**
Answer: Each personality is a static system prompt built around a specific coaching psychology — Blaze uses motivational-interviewing-style collaborative language ("we" framing, empathy-first on setbacks), Metric is data-driven, always citing exact stats and prescribing specific corrections, and Commander is tough-love, direct call-outs with military metaphor. All three share the same structural constraints (reference the runner's live stats, stay under ~40 words) but differ in vocabulary, tone, and how they frame both good and bad news. The live data itself isn't in the prompt — it's injected per-request as the user turn, so the prompt defines *how* to talk and the request defines *what* to talk about.
Follow-up: "How would you evaluate whether a personality is actually 'working' for users?" — Key term: **motivational interviewing** (the actual coaching-psychology term, worth knowing if asked to elaborate).

**24. "Explain the race time prediction formula."**
Answer: Riegel's formula: `T2 = T1 × (D2/D1)^1.06`. Given a known time `T1` over distance `D1`, it predicts time `T2` over a different distance `D2`. The 1.06 exponent is an empirically-fit "fatigue factor" — if pace were held perfectly constant across distances, the exponent would be 1.0, but real runners slow down (in pace-per-km terms) as distance increases, so predicted time grows slightly faster than distance itself. My implementation anchors the reference run to whichever of the runner's completed runs in the last 90 days (minimum 3km) had the fastest average pace, on the reasoning that a best recent effort is the most informative signal of current fitness.
Follow-up: "When does this formula predict badly?" — Key term: **fatigue factor** — and be ready to name the limitation: it's a statistical curve fit with no awareness of training, terrain, or taper, least reliable when extrapolating across very different distance regimes.

**25. "How does multi-run memory work?"**
Answer: On every coaching request, the API route fetches the user's most recently completed run from Postgres and formats it into a one-line summary — distance, duration, average pace, date. That summary gets passed alongside the current run's live context into the LLM call, with an explicit instruction to reference the previous run if relevant. It's intentionally lightweight — one prior run, fetched fresh per request, no persistent conversation history or long-term memory store — but it's enough to let the model say something like "you're pacing faster than your last run," which is a big part of what makes the coaching feel personalized rather than generic.
Follow-up: "How would you extend this to reference trends across many runs, not just the last one?" — Key term: **stateless-per-request memory injection** (be upfront that this is single-run memory, not a real memory system).

**26. "What are the limitations of your AI approach?"**
Answer: A few, and I'd rather name them than pretend they don't exist: coaching text generation has no caching, so every trigger is a fresh paid API call — fine at current scale, a real cost concern at higher volume. Memory is limited to the single most recent run, not a genuine history-aware system. The custom-coach feature stores its prompt in `localStorage` only, so it doesn't sync across devices. And TTS is buffered, not streamed, meaning the client waits for the entire audio clip to finish generating before playback starts, which adds latency proportional to response length.
Follow-up: "Which of those would you fix first?" — Key term: honest, specific limitations — this is the question where naming real gaps (not deflecting) is the strong answer.

### Challenges & Trade-offs

**27. "What was the hardest technical challenge?"**
Answer: Tuning the coaching trigger system's thresholds and priority order. It's easy to wire up an LLM call; it's much harder to decide algorithmically *when* a real coach would speak up, without either annoying the runner with constant chatter or going silent for long stretches. Getting the asymmetric pace thresholds right (15% for a slowdown, 10% for a speedup) and the priority order (discrete events before continuous ones, with an interval fallback) took more iteration than the LLM/TTS integration itself.
Follow-up: "How did you actually tune those numbers — data, intuition, or both?" — Key term: **asymmetric thresholds**.

**28. "What would you do differently?"**
Answer: I'd move TTS to a streaming pipeline to cut perceived latency, add a proper retry/dedupe mechanism for the GPS batch upload (right now duplicate inserts are theoretically possible on a retried batch since there's no uniqueness constraint on point rows), and give multi-run memory more depth — maybe a rolling summary of the last several runs rather than just the single most recent one.
Follow-up: "If you had to pick just one, which first?" — Key term: be ready to justify a single priority, not list all three again.

**29. "What are the known limitations?"**
Answer: Streak calculation buckets runs into calendar days using local time at calculation time, not the timezone the run actually happened in — a real, if minor, correctness gap for users who travel across timezones. GPS accuracy is fundamentally bounded by the device's hardware and environment; my filtering reduces noise but can't fix a genuinely bad fix. And the whole coaching pipeline depends on two third-party APIs (Groq, ElevenLabs) with no local fallback for the LLM side — if Groq were down, coaching text generation fails outright (TTS at least has the Web Speech fallback).
Follow-up: "How would you add resilience against a Groq outage?" — Key term: name the actual single point of failure (no LLM fallback) directly.

**30. "How would you add heart rate monitoring?"**
Answer: I'd integrate with the Web Bluetooth API to pair directly with a BLE heart rate strap (the standard Heart Rate Service/Measurement GATT profile most chest straps and watches expose), stream readings into the same stats snapshot object that already flows into `checkTriggers()`, and add heart-rate-zone-based triggers (e.g., "sustained zone 5 for 60s") alongside the existing pace-based ones. It'd also strengthen the recovery estimation logic, which currently infers intensity from distance and pace alone — actual heart-rate-zone time during the run is a much more direct signal of effort than pace is.
Follow-up: "What are the practical obstacles to Web Bluetooth specifically?" — Key term: **BLE Heart Rate Service** (the actual GATT profile name), and be ready to note Web Bluetooth's limited browser support (notably no Safari/iOS) as a real constraint.

---

## Red Flags to Avoid

- Don't say "Claude/AI wrote it" — say "I built it using modern tooling."
- Don't hand-wave the AI parts — know the prompt engineering details (system prompt vs. injected context, temperature/token settings per function, the trigger system's priority order).
- Don't say "it just works" — explain WHY each choice was made (Haversine vs. Vincenty, Groq vs. OpenAI, JWT vs. database sessions, batching vs. per-point uploads).
- Know the formulas cold (Haversine, Riegel, pace calculation, coefficient of variation) — be able to write them from memory, not just recognize them.
- When asked about limitations, name real ones specifically (timezone handling in streaks, no dedupe on retried GPS batches, buffered not streamed TTS, single-run memory) rather than generic non-answers like "there's always room to improve."

## Numbers to Know

- Haversine formula: R = 6,371,000 meters
- GPS accuracy threshold: 30 meters
- Jitter threshold: 3 meters
- Speed cap: 12 m/s (43.2 km/h)
- LLM response target: < 40 words (15 seconds speech)
- Batch interval: 10 seconds
- Coaching interval: 2 minutes minimum
- Pace drop threshold: 15%
- Pace increase threshold: 10%
- Riegel exponent: 1.06
- Pace smoothing window: 30 seconds
- Pace variability "inconsistent" threshold: CV > 10%
- Recovery hours: 48 (hard) / 24 (moderate) / 12 (easy)
- Recovery intensity thresholds: >10km distance or <300s/km (5:00/km) pace = hard; >6km or <390s/km (6:30/km) = moderate
- Groq model: llama-3.3-70b-versatile
- Groq temperature: 0.8 (live coaching), 0.7 (analysis/plans), 0.9 (run titles)
- Milestone distances: 1km, 5km, 10km, 21,097m (half marathon), 42,195m (marathon)
