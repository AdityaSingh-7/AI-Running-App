# Twitter/X Thread — RunCoach AI

**1/**
I built an AI running coach that actually TALKS to you during your run.

Real-time voice feedback. 3 coaching personalities. Completely free to run.

Here's a thread on how 🧵

**2/**
🛰️ GPS tracking, done properly.

Browser Geolocation → Haversine formula for distance → a filter that rejects points with >30m accuracy error or >12 m/s "speed" (GPS jitter, not you sprinting).

Points batch-upload every 10s instead of hammering the server per GPS tick.

**3/**
🗣️ The core idea: an LLM decides *what* to say, but a deterministic trigger system decides *when* to say it.

Split done? Pace dropped 15%? Crossed 5K? Every check runs with zero AI calls — the LLM only fires when something's actually worth telling you.

**4/**
🧠 The brain: Groq running Llama 3.3 70B — free, and fast enough to feel live, not laggy.

3 personalities, each a full system prompt:
🔥 Blaze — hypes every split
📊 Metric — splits, % deltas, projected finish time
⚔️ Commander — zero excuses, military language

**5/**
🎙️ Text → voice via ElevenLabs neural TTS, with a different voice ID per personality so they don't all sound the same.

If the free tier runs dry or no key is set, it silently falls back to the browser's built-in Web Speech API. The coach never goes silent.

**6/**
🗺️ Live map with MapLibre GL + CARTO dark tiles — free, no API key, and dark enough not to blind you at 6am.

Route renders as a GeoJSON LineString that grows in real time, with a pulsing marker tracking your live position.

**7/**
📊 Post-run analytics that mean something:

- Riegel formula (t2 = t1 × (d2/d1)^1.06) for race time predictions
- First-half vs second-half split analysis → even / positive / negative split detection
- Weekly volume + pace trend charts via Recharts

**8/**
🔥 Streaks and achievements, computed from actual calendar-day logic (not a fake counter) — 13 badges from "First Steps" to a sub-4:00/km "Lightning" badge, evaluated live off your run history.

**9/**
✨ Extras that round it out: build your own custom coach personality, live weather pulled in from Open-Meteo so the coach knows if you're running in the rain, and GPX/CSV export so your data isn't locked in.

17 features total. Every API used is free at hobbyist scale.

**10/**
That's the build. Next.js 16, Groq, ElevenLabs, MapLibre GL, Prisma + Postgres, NextAuth.

Code's on GitHub → [link]

Star it if you like it ⭐ — and if you try it on a run, tell me which coach personality you picked.
