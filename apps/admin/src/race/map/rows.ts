import { consoleCopy as cc, metersBetween, type Quest } from '@grandcityrace/shared';
import type { HostPlayer } from '../../data/players';
import type { HostTeam } from '../../data/teams';
import { teamPosition, type TeamPosition } from '../positions';

// A team on the map: who's in it, where it is, and how it's getting on
export interface Row {
  team: HostTeam;
  members: HostPlayer[];
  position: TeamPosition | null;
  status: { text: string; tone: 'plain' | 'there' | 'done'; questId?: string } | null;
}

export function mapRows(teams: HostTeam[], players: HostPlayer[], quests: Quest[], questOrder: string[], now: number): Row[] {
  return teams
    .map(team => {
      const members = players.filter(p => p.teamId === team.id);
      const position = teamPosition(members.map(p => ({ lastLocation: p.position })), now);
      return { team, members, position, status: statusOf(team, position, quests, questOrder) };
    })
    .sort((a, b) => a.team.name.localeCompare(b.team.name));
}

function statusOf(team: HostTeam, position: TeamPosition | null, quests: Quest[], questOrder: string[]): Row['status'] {
  if (team.finishedAt) return { text: cc.liveMapPage.finished, tone: 'done' };
  const questId = team.currentQuestId ?? questOrder[0] ?? null;
  const quest = quests.find(q => q.id === questId);
  if (!quest) return null;
  const label = cc.liveMapPage.questN({ n: questOrder.indexOf(quest.id) + 1 || '?' });
  if (!quest.location || !position) return { text: label, tone: 'plain', questId: quest.id };
  const there = metersBetween(position, quest.location) <= (quest.fenceRadius ?? 50);
  return { text: `${label} · ${there ? cc.liveMapPage.atTheSpot : cc.liveMapPage.onTheWay}`, tone: there ? 'there' : 'plain', questId: quest.id };
}
