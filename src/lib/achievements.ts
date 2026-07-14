// ─── Achievement types ────────────────────────────────────────────────────────

export interface UserStats {
  totalRuns: number;
  totalDistanceM: number;
  longestRunM: number;
  fastestPaceSecsPerKm: number;
  currentStreak: number;
  maxStreak: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  condition: (stats: UserStats) => boolean;
  unlockedAt?: string;
}

// ─── Achievement definitions ──────────────────────────────────────────────────

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_steps",
    name: "First Steps",
    description: "Complete your first run",
    emoji: "👟",
    condition: (s: UserStats) => s.totalRuns >= 1,
  },
  {
    id: "getting_started",
    name: "Getting Started",
    description: "Complete 5 runs",
    emoji: "🌱",
    condition: (s: UserStats) => s.totalRuns >= 5,
  },
  {
    id: "regular_runner",
    name: "Regular Runner",
    description: "Complete 10 runs",
    emoji: "🏃",
    condition: (s: UserStats) => s.totalRuns >= 10,
  },
  {
    id: "dedicated",
    name: "Dedicated",
    description: "Complete 25 runs",
    emoji: "💪",
    condition: (s: UserStats) => s.totalRuns >= 25,
  },
  {
    id: "5k_finisher",
    name: "5K Finisher",
    description: "Complete a 5km run",
    emoji: "🎯",
    condition: (s: UserStats) => s.longestRunM >= 5000,
  },
  {
    id: "10k_club",
    name: "10K Club",
    description: "Complete a 10km run",
    emoji: "🏅",
    condition: (s: UserStats) => s.longestRunM >= 10000,
  },
  {
    id: "half_marathon",
    name: "Half Marathon",
    description: "Complete a 21.1km run",
    emoji: "🏆",
    condition: (s: UserStats) => s.longestRunM >= 21100,
  },
  {
    id: "marathon_total",
    name: "Marathon Total",
    description: "Cover 42.2km in a single run",
    emoji: "🌍",
    condition: (s: UserStats) => s.longestRunM >= 42200,
  },
  {
    id: "speed_demon",
    name: "Speed Demon",
    description: "Run a sub-5:00/km average pace",
    emoji: "⚡",
    condition: (s: UserStats) =>
      s.fastestPaceSecsPerKm > 0 && s.fastestPaceSecsPerKm < 300,
  },
  {
    id: "lightning",
    name: "Lightning",
    description: "Run a sub-4:00/km average pace",
    emoji: "🌩️",
    condition: (s: UserStats) =>
      s.fastestPaceSecsPerKm > 0 && s.fastestPaceSecsPerKm < 240,
  },
  {
    id: "week_warrior",
    name: "Week Warrior",
    description: "Achieve a 7-day run streak",
    emoji: "🔥",
    condition: (s: UserStats) => s.maxStreak >= 7,
  },
  {
    id: "iron_will",
    name: "Iron Will",
    description: "Achieve a 14-day run streak",
    emoji: "🛡️",
    condition: (s: UserStats) => s.maxStreak >= 14,
  },
  {
    id: "century",
    name: "Century",
    description: "Run 100km total distance",
    emoji: "💯",
    condition: (s: UserStats) => s.totalDistanceM >= 100000,
  },
];

// ─── Calculate unlocked achievements ─────────────────────────────────────────

export function calculateAchievements(stats: UserStats): Achievement[] {
  return ACHIEVEMENTS.filter((a: Achievement) => a.condition(stats));
}

// ─── Calculate run streak ─────────────────────────────────────────────────────

/**
 * Given an array of runs (sorted by startedAt desc or asc), calculates the
 * current streak (consecutive calendar days ending today or yesterday) and the
 * all-time max streak.
 */
export function calculateStreak(
  runs: Array<{ startedAt: string }>
): { current: number; max: number } {
  if (runs.length === 0) return { current: 0, max: 0 };

  // Collect unique calendar days (YYYY-MM-DD) that have a run
  const daySet = new Set<string>();
  for (const run of runs) {
    const d = new Date(run.startedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    daySet.add(key);
  }

  const days = Array.from(daySet).sort(); // ascending

  // Calculate max streak
  let maxStreak = 1;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diffMs = curr.getTime() - prev.getTime();
    const diffDays = Math.round(diffMs / 86400000);
    if (diffDays === 1) {
      streak++;
      if (streak > maxStreak) maxStreak = streak;
    } else {
      streak = 1;
    }
  }

  // Calculate current streak (must include today or yesterday)
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yestKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  const lastDay = days[days.length - 1];
  if (lastDay !== todayKey && lastDay !== yestKey) {
    return { current: 0, max: maxStreak };
  }

  // Walk backwards counting consecutive days
  let current = 1;
  for (let i = days.length - 2; i >= 0; i--) {
    const a = new Date(days[i]);
    const b = new Date(days[i + 1]);
    const diffDays = Math.round((b.getTime() - a.getTime()) / 86400000);
    if (diffDays === 1) {
      current++;
    } else {
      break;
    }
  }

  return { current, max: maxStreak };
}
