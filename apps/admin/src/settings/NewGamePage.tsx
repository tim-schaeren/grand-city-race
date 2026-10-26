import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection } from 'firebase/firestore';
import { consoleCopy as cc, generateJoinCode, paths } from '@grandcityrace/shared';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { to } from '../shell/to';
import { Button } from '../ui/Button';
import { Page } from '../ui/Page';
import { Panel } from '../ui/Panel';
import { newForm, toGameFields, validate, type SettingsForm } from './gameSettings';
import { RaceFields } from './RaceFields';

// A new game: a name, a start and a city, and everything else as it comes.
// Whoever creates it hosts it, and it gets a code for players to join with.
export default function NewGamePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(newForm);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const errors = showErrors ? validate(form, { futureStart: true }) : {};

  async function create() {
    setShowErrors(true);
    if (Object.keys(validate(form, { futureStart: true })).length) return;
    setSaving(true);
    try {
      const ref = await addDoc(collection(db, paths.games()), {
        ...toGameFields(form),
        questOrder: [],
        pausedAt: null,
        totalPausedMs: 0,
        endedAt: null,
        hostIds: [user!.uid],
        joinCode: generateJoinCode(),
      });
      navigate(to.overview(ref.id));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page title={cc.settings.newTitle}>
      <Panel>
        <RaceFields
          form={form}
          errors={errors}
          update={(change: Partial<SettingsForm>) => setForm(f => ({ ...f, ...change }))}
        />
        <div className="mt-6 flex justify-end gap-2">
          <Button tone="quiet" onClick={() => navigate(-1)}>{cc.settings.cancel}</Button>
          <Button tone="primary" disabled={saving} onClick={create}>{saving ? cc.settings.creating : cc.settings.create}</Button>
        </div>
      </Panel>
    </Page>
  );
}
