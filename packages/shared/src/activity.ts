import { copy } from './copy';

// The bulletin board: a record of what happened during a game.
// Entries live in games/{gameId}/activity. Rules decide who may read each one:
// 'public' entries are visible to everyone in the game, 'team' entries only to
// that team (and admins), so a rival can't see what a team spends money on.

export type ActivityType =
  | 'quest_solved'
  | 'team_finished'
  | 'hint_revealed'
  | 'item_bought'
  | 'coins_adjusted'
  | 'game_started'
  | 'game_paused'
  | 'game_resumed'
  | 'game_ended'
  | 'admin_note'
  | 'admin_marked_solved'
  | 'admin_moved'
  | 'admin_finished'
  | 'admin_unfinished'
  // Written by the server when one team uses an item on another
  | 'team_cursed'
  | 'team_robbed'
  | 'coins_donated'
  | 'attack_blocked';

export type ActivityVisibility = 'public' | 'team';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  at: number;
  visibility: ActivityVisibility;
  teamId: string | null;      // null for game-wide events
  teamName: string | null;    // denormalized so the feed renders without extra reads
  questTitle?: string;
  questNumber?: number;
  placement?: number;         // team_finished
  amount?: number;            // coins spent or granted (negative = deducted)
  itemName?: string;          // item_bought
  reason?: string;            // admin adjustment reason
  text?: string;              // admin note
  itemType?: string;          // item_bought, attack_blocked: which item
  targetTeamId?: string;      // the team an item was used on
  targetTeamName?: string;
  durationMinutes?: number;   // team_cursed
}

// Entries players write use deterministic ids, so two teammates acting at the
// same moment produce one entry rather than two.
export const questSolvedId = (teamId: string, questId: string) => `${teamId}_quest_solved_${questId}`;
export const teamFinishedId = (teamId: string) => `${teamId}_finished`;
export const hintRevealedId = (teamId: string, questId: string, index: number) =>
  `${teamId}_hint_${questId}_${index}`;

// Types a player's device is allowed to write (mirrored in firestore.rules)
export const PLAYER_WRITABLE_TYPES: ActivityType[] = [
  'quest_solved',
  'team_finished',
  'hint_revealed',
  'item_bought',
];

// Entries a host caused. They are tagged with the team they concern, but the team
// didn't do them — so they still count as news for that team.
const HOST_INITIATED_TYPES: ActivityType[] = [
  'coins_adjusted',
  'admin_marked_solved',
  'admin_moved',
  'admin_finished',
  'admin_unfinished',
  'admin_note',
];

// Is this entry news to the given team? Their own actions are not; everything
// else is, including game-wide events and anything a host did to them.
export function isNewsFor(entry: ActivityEntry, teamId: string | null | undefined): boolean {
  return entry.teamId !== teamId || HOST_INITIATED_TYPES.includes(entry.type);
}

// Material Design Icons names. The app renders them with @expo/vector-icons
// and the console with @mdi/js — the same set, so both sides match.
export type IconName = string;

const ICONS: Record<ActivityType, IconName> = {
  quest_solved: 'check-circle-outline',
  team_finished: 'trophy-outline',
  hint_revealed: 'lightbulb-outline',
  item_bought: 'compass-outline',
  coins_adjusted: 'circle-multiple-outline',
  game_started: 'flag-outline',
  game_paused: 'pause-circle-outline',
  game_resumed: 'play-circle-outline',
  game_ended: 'flag-checkered',
  admin_note: 'bullhorn-outline',
  admin_marked_solved: 'wrench-outline',
  admin_moved: 'wrench-outline',
  admin_finished: 'wrench-outline',
  admin_unfinished: 'wrench-outline',
  team_cursed: 'skull-outline',
  team_robbed: 'sack-percent',
  coins_donated: 'hand-coin-outline',
  attack_blocked: 'shield-check-outline',
};

const ITEM_ICONS: Record<string, IconName> = {
  compass: 'compass-outline',
  radar: 'radar',
  shield: 'shield-outline',
};


// One place for the logic, so the admin console and the app never disagree;
// the wording itself is in the copy catalog. Pass the reader's team id to
// address them directly: a team reads "You revealed a hint", while admins and
// rival teams read "Team Blue revealed a hint".
export function formatActivity(entry: ActivityEntry, viewerTeamId?: string | null): { icon: string; text: string } {
  const f = copy.feed;
  const mine = !!viewerTeamId && entry.teamId === viewerTeamId;
  const teamName = entry.teamName ?? f.aTeam;
  const who = mine ? f.you : teamName;
  const whoObject = mine ? f.youObject : teamName;
  const quest = entry.questTitle ? f.quoted(entry.questTitle) : f.aQuest;
  const icon =
    (entry.type === 'item_bought' && entry.itemType && ITEM_ICONS[entry.itemType]) ||
    ICONS[entry.type] ||
    'circle-small';
  // Items one team uses on another name both: "You", "you" or the team's name
  const targetMine = !!viewerTeamId && entry.targetTeamId === viewerTeamId;
  const target = targetMine ? f.youObject : entry.targetTeamName ?? f.aTeamObject;
  const amount = entry.amount ?? 0;
  // Solves are public, so they name the quest by number: a title like
  // "The Oldest Tree" would hand every other team their next hint
  const text = ((): string => {
    switch (entry.type) {
      case 'quest_solved':
        return f.questSolved({ who, mine, questTitle: entry.questTitle, questNumber: entry.questNumber });
      case 'team_finished':
        return f.teamFinished({ who, mine, placement: entry.placement });
      case 'hint_revealed':
        return f.hintRevealed({ who, mine, quest, amount });
      case 'item_bought': {
        const known = entry.itemType ? (copy.items as Record<string, { bought: string }>)[entry.itemType] : undefined;
        return f.itemBought({ who, mine, item: known?.bought ?? entry.itemName ?? f.anItem, amount });
      }
      case 'coins_adjusted':
        return f.coinsAdjusted({ who: whoObject, mine, amount, reason: entry.reason });
      case 'game_started':
        return f.gameStarted;
      case 'game_paused':
        return f.gamePaused;
      case 'game_resumed':
        return f.gameResumed;
      case 'game_ended':
        return f.gameEnded;
      case 'admin_note':
        return entry.text ?? '';
      case 'team_cursed':
        return f.teamCursed({ who, mine, target, targetMine, minutes: entry.durationMinutes });
      case 'team_robbed':
        return f.teamRobbed({ who, mine, target, targetMine, amount });
      case 'coins_donated':
        return f.coinsDonated({ who, mine, target, targetMine, amount });
      case 'attack_blocked':
        return f.attackBlocked({
          team: entry.teamName ?? f.aTeamObject,
          mine,
          target: entry.targetTeamName ?? f.aTeam,
          targetMine,
          robbery: entry.itemType === 'robbery',
        });
      case 'admin_marked_solved':
        return f.adminMarkedSolved({ who: whoObject, mine, quest });
      case 'admin_moved':
        return f.adminMoved({ who: whoObject, mine, quest });
      case 'admin_finished':
        return f.adminFinished({ team: who, mine });
      case 'admin_unfinished':
        return f.adminUnfinished({ team: who, mine });
      default:
        return '';
    }
  })();
  return { icon, text };
}

// "14:32" style clock for feed rows, by the game's clock: everyone sees the
// race's own times, wherever they are. Without a zone, the viewer's own.
export function formatActivityTime(at: number, timeZone?: string | null): string {
  const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  try {
    return new Date(at).toLocaleTimeString([], { ...options, timeZone: timeZone ?? undefined });
  } catch {
    // A zone this device doesn't know
    return new Date(at).toLocaleTimeString([], options);
  }
}
