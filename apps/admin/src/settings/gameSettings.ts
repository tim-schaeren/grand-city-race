import { DEFAULT_ECONOMY, DEFAULT_THEME_ID, consoleCopy as cc, gameEconomy, themeFor, type Game, type GeoPoint } from '@grandcityrace/shared';
import { browserTimeZone, fromZonedInput, gameTimeZone, toZonedInput } from '../utils/zonedTime';

// The game's settings as the form holds them: numbers stay text while typed,
// and the start is shown and typed by the game's own clock
export interface SettingsForm {
  name: string;
  start: string;
  timeZone: string;
  city: string;
  cityCoordinates: GeoPoint | null; // set by picking the city from the search, so it's a real place
  maxTeamSize: string;
  maxTeamSpreadMeters: string;
  hotlineNumber: string;
  startingCoins: string;
  coinsPerQuest: string;
  hintCost: string;
  themeId: string;
}

export type SettingsErrors = Partial<Record<keyof SettingsForm, string>>;

export const LIMITS = { name: 60, city: 60, hotline: 30 };

export function newForm(): SettingsForm {
  return {
    name: '',
    start: '',
    timeZone: browserTimeZone(),
    city: '',
    cityCoordinates: null,
    maxTeamSize: '',
    maxTeamSpreadMeters: '',
    hotlineNumber: '',
    startingCoins: String(DEFAULT_ECONOMY.startingCoins),
    coinsPerQuest: String(DEFAULT_ECONOMY.coinsPerQuest),
    hintCost: String(DEFAULT_ECONOMY.hintCost),
    themeId: DEFAULT_THEME_ID,
  };
}

export function toForm(game: Game): SettingsForm {
  const timeZone = gameTimeZone(game);
  const economy = gameEconomy(game);
  return {
    name: game.name,
    start: game.startDateTime ? toZonedInput(game.startDateTime, timeZone) : '',
    timeZone,
    city: game.city,
    cityCoordinates: game.cityCoordinates ?? null,
    maxTeamSize: game.maxTeamSize ? String(game.maxTeamSize) : '',
    maxTeamSpreadMeters: game.maxTeamSpreadMeters ? String(game.maxTeamSpreadMeters) : '',
    hotlineNumber: game.hotlineNumber ?? '',
    startingCoins: String(economy.startingCoins),
    coinsPerQuest: String(economy.coinsPerQuest),
    hintCost: String(economy.hintCost),
    themeId: themeFor(game.themeId).id,
  };
}

const whole = (value: string) => (value.trim() === '' ? NaN : Number(value));

// A start set for a race that hasn't begun must be in the future: one in the
// past would start the race the moment it's saved, which is Start now's job
export function validate(form: SettingsForm, { futureStart }: { futureStart: boolean }): SettingsErrors {
  const e: SettingsErrors = {};
  if (!form.name.trim()) e.name = cc.settings.required;
  if (!form.start) e.start = cc.settings.required;
  else if (futureStart && (fromZonedInput(form.start, form.timeZone) as number) <= Date.now()) e.start = cc.settings.startInFuture;
  if (!form.city.trim()) e.city = cc.settings.required;
  else if (!form.cityCoordinates) e.city = cc.settings.pickCity;
  for (const field of ['startingCoins', 'coinsPerQuest', 'hintCost'] as const) {
    const n = whole(form[field]);
    if (!Number.isInteger(n) || n < 0) e[field] = cc.settings.zeroOrMore;
  }
  for (const field of ['maxTeamSize', 'maxTeamSpreadMeters'] as const) {
    const n = whole(form[field]);
    if (form[field].trim() && (!Number.isInteger(n) || n < 1)) e[field] = cc.settings.oneOrMore;
  }
  return e;
}

// What's saved on the game
export function toGameFields(form: SettingsForm) {
  const limit = (value: string) => (value.trim() ? Number(value) : null);
  return {
    name: form.name.trim(),
    startDateTime: fromZonedInput(form.start, form.timeZone) as number,
    timeZone: form.timeZone,
    city: form.city.trim(),
    cityCoordinates: form.cityCoordinates!,
    maxTeamSize: limit(form.maxTeamSize),
    maxTeamSpreadMeters: limit(form.maxTeamSpreadMeters),
    hotlineNumber: form.hotlineNumber.trim(),
    startingCoins: Number(form.startingCoins),
    coinsPerQuest: Number(form.coinsPerQuest),
    hintCost: Number(form.hintCost),
    themeId: form.themeId,
  };
}
