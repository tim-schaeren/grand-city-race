import type { Game, TeamState } from './types';

export const DEFAULT_ECONOMY = {
  startingCoins: 0,
  coinsPerQuest: 10,
  hintCost: 10,
};

export type Economy = typeof DEFAULT_ECONOMY;

function positiveOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

// Games created before the economy existed fall back to the defaults
export function gameEconomy(game: Partial<Game> | null | undefined): Economy {
  return {
    startingCoins: positiveOr(game?.startingCoins, DEFAULT_ECONOMY.startingCoins),
    coinsPerQuest: positiveOr(game?.coinsPerQuest, DEFAULT_ECONOMY.coinsPerQuest),
    hintCost: positiveOr(game?.hintCost, DEFAULT_ECONOMY.hintCost),
  };
}

// A team with no balance yet holds the game's starting coins
export function teamCoins(state: Partial<TeamState> | null | undefined, economy: Economy): number {
  return typeof state?.coins === 'number' && Number.isFinite(state.coins) ? state.coins : economy.startingCoins;
}

export function hintsRevealedFor(state: Partial<TeamState> | null | undefined, questId: string): number {
  const count = state?.hintsRevealed?.[questId];
  return typeof count === 'number' && count > 0 ? count : 0;
}
