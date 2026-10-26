import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { consoleCopy as cc, copy, paths } from '@grandcityrace/shared';
import { db } from '../firebase';
import { useGame, type GameWithId } from '../data/games';
import { to } from '../shell/to';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Field, TextInput } from '../ui/Field';
import { Page } from '../ui/Page';
import { Panel } from '../ui/Panel';
import { Empty, Show } from '../ui/States';
import { Status } from '../ui/Status';
import { host } from '../utils/api';
import { LIMITS, toForm, toGameFields, validate, type SettingsForm } from './gameSettings';
import { RaceFields } from './RaceFields';
import { ThemePicker } from './ThemePicker';

export default function SettingsPage() {
  const { gameId } = useParams();
  const game = useGame(gameId);
  return (
    <Show live={game} isEmpty={g => !g} empty={<Empty title={copy.server.noGame} />}>
      {g => <Settings key={g!.id} game={g!} />}
    </Show>
  );
}

function Settings({ game }: { game: GameWithId }) {
  const [form, setForm] = useState(() => toForm(game));
  const [saved, setSaved] = useState(form);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  // A changed start must be in the future while the race hasn't begun
  const futureStart = Date.now() < game.startDateTime && (form.start !== saved.start || form.timeZone !== saved.timeZone);
  const errors = validate(form, { futureStart });
  const update = (change: Partial<SettingsForm>) => setForm(f => ({ ...f, ...change }));

  // Closing the tab with changes asks first
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function save() {
    setShowErrors(true);
    if (Object.keys(errors).length) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, paths.game(game.id)), toGameFields(form));
      setSaved(form);
      setShowErrors(false);
    } finally {
      setSaving(false);
    }
  }

  const shown = showErrors ? errors : {};
  return (
    <Page
      title={cc.settings.title}
      description={dirty ? <Status tone="warn">{cc.settings.unsaved}</Status> : <Status tone="good">{cc.settings.saved}</Status>}
      actions={
        <>
          {dirty && <Button tone="quiet" onClick={() => { setForm(saved); setShowErrors(false); }}>{cc.settings.discard}</Button>}
          <Button tone="primary" disabled={!dirty || saving} onClick={save}>{saving ? cc.settings.saving : cc.settings.save}</Button>
        </>
      }
    >
      <div className="space-y-6">
        <Panel title={cc.settings.race}>
          <RaceFields form={form} errors={shown} update={update} />
        </Panel>

        <Panel title={cc.settings.teams}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={cc.settings.maxTeamSize} error={shown.maxTeamSize}>
              {id => <TextInput id={id} type="number" min={1} maxLength={4} placeholder={cc.settings.noLimit} value={form.maxTeamSize} onChange={e => update({ maxTeamSize: e.target.value })} />}
            </Field>
            <Field label={cc.settings.maxTeamSpread} help={cc.settings.maxTeamSpreadHelp} error={shown.maxTeamSpreadMeters}>
              {id => <TextInput id={id} type="number" min={1} maxLength={6} placeholder={cc.settings.noLimit} value={form.maxTeamSpreadMeters} onChange={e => update({ maxTeamSpreadMeters: e.target.value })} />}
            </Field>
          </div>
          <div className="mt-5">
            <Field label={cc.settings.hotline} help={cc.settings.hotlineHelp}>
              {id => <TextInput id={id} type="tel" maxLength={LIMITS.hotline} placeholder="+41 79 123 45 67" value={form.hotlineNumber} onChange={e => update({ hotlineNumber: e.target.value })} />}
            </Field>
          </div>
        </Panel>

        <Panel title={cc.settings.look}>
          <ThemePicker value={form.themeId} onChange={themeId => update({ themeId })} />
        </Panel>

        <Panel title={cc.settings.coins}>
          <div className="grid grid-cols-3 gap-4">
            {([['startingCoins', cc.settings.startingCoins], ['coinsPerQuest', cc.settings.coinsPerQuest], ['hintCost', cc.settings.hintCost]] as const).map(([field, label]) => (
              <Field key={field} label={label} error={shown[field]}>
                {id => <TextInput id={id} type="number" min={0} maxLength={6} value={form[field]} onChange={e => update({ [field]: e.target.value })} />}
              </Field>
            ))}
          </div>
        </Panel>

        <DeleteGame game={game} />
      </div>
    </Page>
  );
}

function DeleteGame({ game }: { game: GameWithId }) {
  const navigate = useNavigate();
  const [asking, setAsking] = useState(false);
  return (
    <Panel title={cc.settings.deleteTitle}>
      <Button tone="danger" onClick={() => setAsking(true)}>{cc.settings.deleteTitle}</Button>
      {asking && (
        <ConfirmDialog
          title={cc.settings.deleteQuestion}
          confirmLabel={cc.settings.deleteForGood}
          typeToConfirm={game.name}
          onConfirm={async () => {
            // The server deletes everything under the game too
            await host('deleteGame', { gameId: game.id });
            navigate(to.games());
          }}
          onClose={() => setAsking(false)}
        >
          {cc.settings.deleteHelp}
        </ConfirmDialog>
      )}
    </Panel>
  );
}
