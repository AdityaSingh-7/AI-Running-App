# 🏃 RunCoach AI

**AI-powered running coach with real-time voice feedback, GPS tracking, and performance analytics.**

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)

## ✨ Features

### 🗺️ GPS Run Tracking
- Real-time GPS tracking via browser Geolocation API
- Live route visualization on MapLibre GL maps
- Automatic distance, pace, and elevation calculation
- Smart GPS point filtering (accuracy, jitter, impossible speeds)
- Batch point upload every 10 seconds

### 🎙️ AI Voice Coaching (3 Personalities)
- **Coach Mo** 🔥 — Motivational, warm, celebrates every milestone
- **Coach Data** 📊 — Analytical, splits-focused, pacing strategy
- **Sergeant Steel** 💪 — Tough love, no excuses, pushes limits

Coaching triggers on: split completion, pace drops, pace surges, distance milestones, and timed intervals.

**Powered by [Vapi](https://vapi.ai)** for real-time bidirectional voice AI, with Web Speech API fallback (free).

### 📊 Analytics Dashboard
- Weekly distance bar charts (Recharts)
- Pace trends over time
- Personal records tracking
- Run history with filtering and sorting
- Individual run detail with map replay and split table

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5.5 |
| UI | shadcn/ui + Tailwind CSS |
| Database | Prisma 7 + SQLite (dev) / PostgreSQL (prod) |
| Auth | NextAuth v5 (Credentials + GitHub OAuth) |
| Maps | MapLibre GL via react-map-gl (free, no API key) |
| Voice AI | Vapi (@vapi-ai/web) + Web Speech API fallback |
| State | Zustand |
| Charts | Recharts |
| Validation | Zod |

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm

### Installation

```bash
# Clone the repo
git clone <repo-url>
cd running-coach

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your keys (see below)

# Run database migration
npx prisma migrate dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Vapi for AI voice coaching
NEXT_PUBLIC_VAPI_PUBLIC_KEY=""
VAPI_PRIVATE_KEY=""

# Optional: GitHub OAuth
GITHUB_ID=""
GITHUB_SECRET=""
```

> **Note:** The app works without Vapi keys — it falls back to Web Speech API for coaching.

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, Register pages
│   ├── (app)/           # Authenticated app shell
│   │   ├── dashboard/   # Analytics dashboard
│   │   ├── run/         # Coach selection + active run
│   │   ├── history/     # Run history + detail
│   │   └── settings/    # User preferences
│   └── api/             # REST API routes
│       ├── runs/        # CRUD + GPS points
│       ├── analytics/   # Aggregated stats
│       └── auth/        # NextAuth handlers
├── components/
│   ├── analytics/       # Charts (PaceChart, WeeklyVolume, PersonalRecords)
│   ├── coaching/        # VoiceCoach overlay
│   ├── map/             # RunMap (live) + RouteMap (static)
│   └── ui/              # shadcn/ui components
├── hooks/               # useGeolocation, useRunSession, useVoiceCoach, useWakeLock
├── lib/                 # Auth, Prisma, geo utils, coaching personalities
├── stores/              # Zustand run store
└── types/               # TypeScript types
```

## 🏗️ Architecture

### GPS Tracking Flow
```
watchPosition() → useGeolocation (filter) → useRunSession (stats) → Zustand store
                                                                   ↓
                                                          Batch POST /api/runs/[id]/points (every 10s)
```

### Voice Coaching Flow
```
Run starts → Vapi SDK connects → Stats update every 30s → Triggers fire → Coach speaks
                                                          (split, pace change, milestone, interval)
```

## 📱 Mobile Usage

This app is designed for use on a phone during runs:
- Large touch targets (56px+ buttons)
- Dark theme during active runs (outdoor visibility)
- Wake Lock API keeps screen on
- Minimal interaction required while running

> **Known limitation:** Browsers stop GPS when the tab is backgrounded. Keep the screen on during runs.

## 🚢 Deployment

Ready for Vercel deployment:

1. Switch database to PostgreSQL (Neon, Supabase, or Vercel Postgres)
2. Update `DATABASE_URL` in Vercel environment variables
3. Push to GitHub and connect to Vercel

## 📄 License

MIT
