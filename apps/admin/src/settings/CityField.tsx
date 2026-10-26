import { useState } from 'react';
import { consoleCopy as cc } from '@grandcityrace/shared';
import Icon from '../components/Icon';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { searchPlaces, type Place } from '../utils/places';
import { LIMITS, type SettingsForm } from './gameSettings';

// The game's city, picked from a search so it's a place the maps know, and
// the right one of several of that name. Typing again asks for a new pick.
export function CityField({ form, error, update }: {
  form: SettingsForm;
  error?: string;
  update: (change: Partial<SettingsForm>) => void;
}) {
  const [matches, setMatches] = useState<Place[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);

  async function find() {
    if (!form.city.trim() || searching) return;
    setSearching(true);
    setFailed(false);
    try {
      setMatches(await searchPlaces(form.city.trim()));
    } catch {
      setFailed(true);
    } finally {
      setSearching(false);
    }
  }

  return (
    <Field label={cc.settings.city} error={error}>
      {id => (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              id={id}
              maxLength={LIMITS.city}
              value={form.city}
              placeholder={cc.settings.cityPlaceholder}
              onChange={e => {
                update({ city: e.target.value, cityCoordinates: null });
                setPicked(null);
                setMatches(null);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  find();
                }
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <Button disabled={!form.city.trim() || searching || !!form.cityCoordinates} onClick={find}>
              {searching ? cc.settings.finding : cc.settings.find}
            </Button>
          </div>
          {form.cityCoordinates ? (
            <p className="flex items-center gap-1 text-xs text-green-700">
              <Icon name="check" size={14} /> {picked ?? cc.settings.cityOnMap}
            </p>
          ) : failed ? (
            <p className="text-xs text-red-600">{cc.settings.searchFailed}</p>
          ) : matches && matches.length === 0 ? (
            <p className="text-xs text-red-600">{cc.settings.noMatches}</p>
          ) : matches ? (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
              {matches.map(place => (
                <li key={`${place.lat},${place.lng}`}>
                  <button
                    type="button"
                    onClick={() => {
                      update({ city: place.name, cityCoordinates: { lat: place.lat, lng: place.lng } });
                      setPicked(place.label);
                      setMatches(null);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
                  >
                    {place.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </Field>
  );
}
