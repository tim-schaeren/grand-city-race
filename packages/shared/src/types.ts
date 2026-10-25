// ─── Users ────────────────────────────────────────────────────────────────────

// users/{uid}: private to its owner. Which games someone is in lives in each
// game's player list; platform admins carry an `admin` claim on their sign-in.
export interface UserProfile {
  id: string;           // Firebase Auth UID
  name: string;
  email: string;
  createdAt: number;
  acceptedTermsAt?: number;   // when they agreed to the terms, at sign-up
  pushTokens?: string[];      // Expo push tokens of their phones; the server reads them
}

// ─── Teams ────────────────────────────────────────────────────────────────────

// games/{gameId}/teams/{teamId}: what everyone in the game sees of a team.
// Only the server writes it.
export interface Team {
  id: string;
  gameId: string;
  name: string;
  color: string;              // used on maps and in the standings
  memberIds: string[];
  solvedCount: number;        // quests solved
  finishedAt: number | null;
  pausedMsAtFinish?: number;  // the game's pause total when the team finished; see raceTime.ts
}

// games/{gameId}/teams/{teamId}/private/state: what only the team and its
// hosts see. Only the server writes it, apart from the chat read markers.
export interface TeamState {
  gameId: string;
  teamId: string;
  coins: number;
  currentQuestId: string | null;          // null once finished
  completedQuestIds: string[];
  hintsRevealed: Record<string, number>;  // questId -> how many hints the team has paid for
  quest: QuestView | null;                // the current quest, as the team may see it
  activeCompassUntil?: number;            // the bought compass runs out
  activeRadarUntil?: number;              // the bought radar runs out
  shields?: number;                       // shields bought and not yet used up
  cursedUntil?: number;                   // frozen until then
  cursedByName?: string;                  // the team that cast the curse
  robbedAt?: number;                      // starts the robbery cooldown
  teamChatReadAt?: number;                // newest host message the team has seen
  hostChatReadAt?: number;                // newest team message the hosts have seen
}

// The team's view of its current quest. Never holds answers; the text and
// title arrive once the quest is unlocked, hints once paid for.
export interface QuestView {
  questId: string;
  trigger: QuestTrigger;
  task: QuestTask;
  navigationHint: ContentBlock[];
  location?: GeoPoint;            // location: the fence, compass and radar need it
  fenceRadius?: number;
  distanceMeters?: number;        // distance: the target
  showDistanceProgress?: boolean;
  durationSeconds?: number;       // timer
  unlockedAt: number | null;
  pausedMsAtUnlock: number;       // the game's pause total at unlock; later pauses don't count toward timers
  walkedMeters: number;           // distance: the furthest any member has reported
  title?: string;
  description?: ContentBlock[];
  hints: QuestHint[];             // the ones paid for
  hintCount: number;              // how many the quest has
}

// Host adjustments to a balance, under games/{gameId}/teams/{teamId}/coinLedger
export interface CoinLedgerEntry {
  id: string;
  delta: number;
  reason: string;
  balanceAfter: number;
  byName: string;
  at: number;
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
  maxTeamSize?: number;     // most players a team may have
  maxTeamSpreadMeters: number | null; // null = unlimited; blocks answer submission if exceeded
  startingCoins?: number;   // coins each team begins with (default 0)
  coinsPerQuest?: number;   // coins paid for each solved quest (default 10)
  hintCost?: number;        // flat price of revealing one hint (default 10)
  pausedAt: number | null;  // timestamp when game was paused; null = not paused
  totalPausedMs: number;    // accumulated pause duration in ms (updated on resume)
  endedAt: number | null;   // timestamp when admin ended the game; null = not ended
  recapPublishedAt?: number | null; // when hosts showed players the recap (games/{id}/recap/summary)
  trailClearedAt?: number | null;   // when the location trails were deleted; see retention.ts
}

// ─── Game membership ──────────────────────────────────────────────────────────

// games/{gameId}/players/{uid}: who is in the game and on which team. The one
// record of membership; only the server writes it.
export interface GamePlayer {
  uid: string;
  name: string;
  teamId: string | null;
  joinedAt: number;
}

// games/{gameId}/positions/{uid}: a player's last position, for the live map
// and the team spread check. Written by the player.
export interface Position {
  uid: string;
  teamId: string;
  lat: number;
  lng: number;
  updatedAt: number;
}

// games/{gameId}/trail/{pointId}: one point of a player's route. Deleted a
// week after the race; the recap keeps its own simplified routes.
export interface TrailPoint {
  uid: string;
  teamId: string;
  lat: number;
  lng: number;
  t: number;
}
