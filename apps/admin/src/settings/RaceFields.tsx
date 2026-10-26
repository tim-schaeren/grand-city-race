import { consoleCopy as cc } from '@grandcityrace/shared';
import { Field, Select, TextInput } from '../ui/Field';
import { TIME_ZONES } from '../utils/zonedTime';
import { CityField } from './CityField';
import { LIMITS, type SettingsErrors, type SettingsForm } from './gameSettings';

// Name, start and city: all a new game needs, and the top of its settings
export function RaceFields({ form, errors, update }: {
  form: SettingsForm;
  errors: SettingsErrors;
  update: (change: Partial<SettingsForm>) => void;
}) {
  const zones: string[] = TIME_ZONES.includes(form.timeZone) ? TIME_ZONES : [form.timeZone, ...TIME_ZONES];
  return (
    <div className="space-y-5">
      <Field label={cc.settings.name} error={errors.name}>
        {id => <TextInput id={id} maxLength={LIMITS.name} value={form.name} placeholder={cc.settings.namePlaceholder} onChange={e => update({ name: e.target.value })} />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={cc.settings.start} error={errors.start}>
          {id => (
            <input
              id={id}
              type="datetime-local"
              value={form.start}
              onChange={e => update({ start: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          )}
        </Field>
        <Field label={cc.settings.timeZone}>
          {id => (
            <Select id={id} value={form.timeZone} onChange={e => update({ timeZone: e.target.value })}>
              {zones.map(zone => <option key={zone} value={zone}>{zone.replace(/_/g, ' ')}</option>)}
            </Select>
          )}
        </Field>
      </div>
      <CityField form={form} error={errors.city} update={update} />
    </div>
  );
}
