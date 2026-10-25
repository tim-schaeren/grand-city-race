// ─── Users ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;           // Firebase Auth UID
  name: string;
  email: string;
  isAdmin: boolean;
  gameId?: string | null;     // the game they joined, before picking a team
  teamId: string | null;
  pushToken: string | null;   // Expo push token for notifications
  createdAt: number;          // Unix timestamp
  lastLocation: { lat: number; lng: number; updatedAt: number } | null;
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  color: string;             // hex color chosen by admin, used on map
  gameId: string;
  memberIds: string[];
  currentQuestId: string | null;
  completedQuestIds: string[];
  finishedAt: number | null;
  pausedMsAtFinish?: number;                 // the game's pause total when the team finished; see raceTime.ts
  questProgress: QuestProgress | null;
  coins?: number;                            // team purse; absent means the game's startingCoins
  activeCompassUntil?: number;               // timestamp the bought compass runs out
  activeRadarUntil?: number;                 // timestamp the bought radar runs out
  shields?: number;                          // shields bought and not yet used up
  cursedUntil?: number;                      // set by the server: frozen until then
  cursedByName?: string;                     // the team that cast the curse
  robbedAt?: number;                         // set by the server: starts the robbery cooldown
  hintsRevealed?: Record<string, number>;    // questId -> how many hints the team has paid for
  teamChatReadAt?: number;                   // newest host message the team has seen
  hostChatReadAt?: number;                   // newest team message the hosts have seen
}

// Admin adjustments to a balance, stored under teams/{teamId}/coinLedger
export interface CoinLedgerEntry {
  id: string;
  delta: number;
  reason: string;
  balanceAfter: number;
  byName: string;
  at: number;
}

// Shared progress on the current quest, so every team member sees the same state
export interface QuestProgress {
  questId: string;              // progress is ignored if this doesn't match the current quest
  unlockedAt: number | null;    // when the trigger was first satisfied
  pausedMsAtUnlock: number;     // game.totalPausedMs at unlock; later pauses don't count toward timers
  distanceMeters: number;       // distance trigger: furthest distance reported by any member
}

// ─── Quests ───────────────────────────────────────────────────────────────────

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; url: string; caption?: string }
  | { type: 'youtube'; videoId: string };

// Firestore has no nested arrays, so each hint wraps its blocks in a map
export interface QuestHint {
  blocks: ContentBlock[];
}

export type QuestTrigger =
  | 'location'  // unlocks inside the geofence
  | 'distance'  // unlocks after the team has moved a set distance
  | 'none';     // unlocked immediately

export type QuestTask =
  | 'answer'    // type a valid answer
  | 'timer'     // wait for a countdown (e.g. mandatory break)
  | 'continue'; // read and tap continue (info)

// Fields not relevant to the chosen trigger/task are omitted from the document.
// Legacy quests have no trigger/task and plain-string content — see normalizeQuest().
export interface Quest {
  id: string;
  title: string;
  trigger: QuestTrigger;
  task: QuestTask;
  description: ContentBlock[];
  navigationHint: ContentBlock[]; // location/distance: shown before the quest unlocks
  fenceRadius?: number;           // location: meters; player must be within this radius
  location?: GeoPoint;            // location
  distanceMeters?: number;        // distance: meters to travel after the quest starts
  answers?: string[];             // answer: trimmed; multiple valid answers allowed
  hints?: QuestHint[];            // answer: each hint is its own list of blocks
  showDistanceProgress?: boolean; // distance: show how far the team has come (default true)
  durationSeconds?: number;       // timer
  isActive: boolean;              // admin can hide without deleting
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

// ─── Answer Attempts ──────────────────────────────────────────────────────────

// Rejected answers, stored in games/{gameId}/attempts so hosts can spot a quest
// whose answer list is too strict, and teams that are stuck. Hosts only.
export interface AnswerAttempt {
  id: string;
  questId: string;
  teamId: string;
  teamName: string;
  text: string;      // what the team actually typed, trimmed
  at: number;
}

// ─── Chat Messages ────────────────────────────────────────────────────────────

// Lives in games/{gameId}/messages. One thread per team: that team and the
// game's hosts. Teams never see each other's threads.
export interface ChatMessage {
  id: string;
  teamId: string;
  authorId: string;
  authorName: string;
  fromHost: boolean;
  text: string;
  sentAt: number;
}

// ─── Games ────────────────────────────────────────────────────────────────────

export interface Game {
  id: string;
  name: string;
  startDateTime: number;    // Unix timestamp
  timeZone?: string;        // IANA zone the console shows and takes times in; the host's own if absent
  city: string;
  cityCoordinates: GeoPoint;
  questOrder: string[];     // ordered list of quest IDs (subcollection)
  hostIds?: string[];       // users who may run this game; platform admins can run every game
  joinCode?: string;        // what players type to join
  themeId?: string;         // visual theme for players; see themes.ts
  hotlineNumber?: string;   // phone number teams can call when something goes wrong
  shop?: Record<string, { enabled?: boolean; price?: number; durationMinutes?: number; percent?: number; cap?: number }>;
  maxTeamSize?: number;     // optional soft limit shown in admin UI
  maxTeamSpreadMeters: number | null; // null = unlimited; blocks answer submission if exceeded
  startingCoins?: number;   // coins each team begins with (default 0)
  coinsPerQuest?: number;   // coins paid for each solved quest (default 10)
  hintCost?: number;        // flat price of revealing one hint (default 10)
  pausedAt: number | null;  // timestamp when game was paused; null = not paused
  totalPausedMs: number;    // accumulated pause duration in ms (updated on resume)
  endedAt: number | null;   // timestamp when admin ended the game; null = not ended
  recapPublishedAt?: number | null; // when hosts showed players the recap (games/{id}/recap/summary)
}

// ─── Game membership ──────────────────────────────────────────────────────────

// games/{gameId}/players/{uid}: who has joined, so a host can see their own
// players without being able to read the whole platform's user list
export interface GamePlayer {
  id: string;        // the user's uid
  name: string;
  joinedAt: number;
}
