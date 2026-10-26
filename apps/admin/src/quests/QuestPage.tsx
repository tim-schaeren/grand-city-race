import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import {
  checkGame, consoleCopy as cc, gameEconomy, hintsRevealedFor, MAX_QUESTS_PER_GAME, paths, previewMoments, previewQuestView,
  type PreviewMoment, type Quest,
} from '@grandcityrace/shared';
import { db } from '../firebase';
import { host } from '../utils/api';
import { useAttempts } from '../data/attempts';
import { phaseOf, useGame, type GameWithId } from '../data/games';
import { dataOr } from '../data/live';
import { inOrder, useQuests } from '../data/quests';
import { useTeams } from '../data/teams';
import { BackLink } from '../entities/BackLink';
import { to } from '../shell/to';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Page } from '../ui/Page';
import { Empty, Show } from '../ui/States';
import { Status } from '../ui/Status';
import { ViewTabs } from '../ui/Tabs';
import { PhonePreview } from './PhonePreview';
import { QuestEditor } from './QuestEditor';
import { QuestRaceDay } from './QuestRaceDay';
import { toForm, toPreviewQuest, toQuestData, validate, type QuestForm } from './questForm';

// One quest: written the way teams live it, with the phone beside it, and on
// race day who's on it. "new" is a quest not saved yet.
export default function QuestPage() {
  const { gameId, questId } = useParams();
  const game = useGame(gameId);
  const quests = useQuests(gameId);
  return (
    <div>
      <BackLink fallback={to.quests(gameId!)} />
      <Show live={quests}>
        {list => {
          const quest = list.find(q => q.id === questId) ?? null;
          const g = dataOr(game, null);
          if (!quest && questId !== 'new') return <Empty title={cc.entities.notFound} />;
          if (!g) return null;
          return <QuestWorkspace key={questId} game={g} quest={quest} quests={list} />;
        }}
      </Show>
    </div>
  );
}

const FINDING_STYLE = {
  problem: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  note: 'border-gray-200 bg-white text-gray-700',
};

function QuestWorkspace({ game, quest, quests }: { game: GameWithId; quest: Quest | null; quests: Quest[] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [now] = useState(() => Date.now());
  const teams = dataOr(useTeams(game.id), []);
  const attempts = dataOr(useAttempts(game.id), []).filter(a => a.questId === quest?.id);
  const ordered = inOrder(quests, game.questOrder);
  const index = quest ? ordered.findIndex(q => q.id === quest.id) : ordered.length;
  const number = index >= 0 ? index + 1 : null;
  const previous = index > 0 ? { quest: ordered[index - 1], number: index } : null;
  const total = quest ? ordered.length : ordered.length + 1;
  const economy = gameEconomy(game);

  const [form, setForm] = useState<QuestForm>(() => toForm(quest));
  const [saved, setSaved] = useState<QuestForm>(form);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // While the race runs a quest opens on its race day, unless it was just written
  const [view, setView] = useState<'quest' | 'raceDay'>(
    () => location.state?.view ?? (quest && phaseOf(game, now) === 'race' ? 'raceDay' : 'quest'),
  );
  const [moment, setMoment] = useState<PreviewMoment>('arrived');
  const [deleting, setDeleting] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const otherTitles = quests.filter(q => q.id !== quest?.id).map(q => q.title);
  const errors = validate(form, otherTitles);
  const phoneRoom = usePhoneRoom(view);
  const onItNow = quest ? teams.filter(t => t.currentQuestId === quest.id && !t.finishedAt).length : 0;
  const update = (change: Partial<QuestForm> | ((f: QuestForm) => Partial<QuestForm>)) =>
    setForm(f => ({ ...f, ...(typeof change === 'function' ? change(f) : change) }));

  // Closing the tab with changes asks first
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // What the phone shows: the quest as typed so far, at the chosen moment
  const draft = toPreviewQuest(form, quest?.id ?? 'new');
  // The game checker on this quest as typed. A quest not saved yet is still
  // being written, and the form's own checks speak when it's saved.
  const findings = quest
    ? checkGame({ game, quests: [...quests.filter(q => q.id !== draft.id), draft], players: [] })
      .filter(i => i.target.kind === 'quest' && i.target.questId === draft.id)
    : [];
  const moments = previewMoments(draft);
  // A moment the quest doesn't have (yet) shows it arrived, which every quest has
  const shown = moments.includes(moment) ? moment : 'arrived';
  const draftKey = JSON.stringify(draft);
  const scene = useMemo(() => ({
    moment: shown,
    quest: previewQuestView(draft, shown, now),
    themeId: game.themeId,
    questNumber: number ?? total,
    totalQuests: total,
    coins: economy.startingCoins + economy.coinsPerQuest * Math.max(0, (number ?? total) - 1),
    hintCost: economy.hintCost,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [draftKey, shown, game.themeId, number, total, economy.startingCoins, economy.coinsPerQuest, economy.hintCost, now]);

  async function save() {
    setShowErrors(true);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    setError(null);
    try {
      const data = toQuestData(form);
      if (quest) {
        // Replaced, not merged, so fields of an earlier trigger or task don't linger
        await setDoc(doc(db, paths.quest(game.id, quest.id)), data);
        const fresh = toForm({ ...data, id: quest.id });
        setForm(fresh);
        setSaved(fresh);
        setShowErrors(false);
      } else {
        const ref = await addDoc(collection(db, paths.quests(game.id)), data);
        await setDoc(doc(db, paths.game(game.id)), { questOrder: [...(game.questOrder ?? []), ref.id] }, { merge: true });
        setSaved(form);
        navigate(to.quest(game.id, ref.id), { replace: true, state: { view: 'quest' } });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!quest) return;
    // On the server, so teams on it move on to the next quest
    await host('deleteQuest', { gameId: game.id, questId: quest.id });
    setSaved(form);
    navigate(to.quests(game.id), { replace: true });
  }

  const title = quest
    ? number ? cc.questPage.title({ n: number, of: ordered.length, title: quest.title }) : cc.questPage.notInOrder({ title: quest.title })
    : cc.questEditor.newQuest;
  const atLimit = !quest && quests.length >= MAX_QUESTS_PER_GAME;

  return (
    <Page
      wide
      title={title}
      description={dirty ? <Status tone="warn">{cc.questEditor.unsaved}</Status> : quest ? <Status tone="good">{cc.questEditor.saved}</Status> : undefined}
      actions={
        <>
          {dirty && <Button tone="quiet" onClick={() => { setForm(saved); setShowErrors(false); }}>{cc.questEditor.discard}</Button>}
          <Button tone="primary" disabled={saving || atLimit || (!dirty && !!quest)} onClick={save}>
            {saving ? cc.questEditor.saving : cc.questEditor.save}
          </Button>
        </>
      }
    >
      {atLimit && <p className="mb-4 text-sm text-red-600">{cc.questsPage.aGameMayHoldAt({ maxQuestsPerGame: MAX_QUESTS_PER_GAME })}</p>}
      {onItNow > 0 && dirty && <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{cc.questEditor.liveWarning({ n: onItNow })}</p>}
      {showErrors && Object.keys(errors).length > 0 && <p className="mb-4 text-sm text-red-600" role="alert">{cc.questEditor.fixFirst}</p>}
      {error && <p className="mb-4 text-sm text-red-600" role="alert">{error}</p>}

      {quest && (
        <ViewTabs
          value={view}
          onChange={setView}
          tabs={[
            { value: 'quest', label: cc.questEditor.tabQuest },
            { value: 'raceDay', label: cc.questEditor.tabRaceDay, badge: onItNow },
          ]}
        />
      )}

      {quest && view === 'raceDay' ? (
        <QuestRaceDay game={game} quest={quest} quests={quests} teams={teams} />
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            {findings.length > 0 && (
              <ul className="space-y-2">
                {findings.map(f => (
                  <li key={f.key} className={`rounded-lg border px-4 py-3 text-sm ${FINDING_STYLE[f.level]}`}>
                    {f.text}
                  </li>
                ))}
              </ul>
            )}
            <QuestEditor
              form={form}
              update={update}
              errors={showErrors ? errors : {}}
              previous={previous}
              cityCoordinates={game.cityCoordinates}
              hintCost={economy.hintCost}
              attempts={attempts}
              // Hints are bought in order, so a team with two has bought the first and the second
              onMoment={setMoment}
              hintsBoughtBy={(quest?.hints ?? []).map((_, i) => teams.filter(t => quest && hintsRevealedFor(t, quest.id) > i).length)}
            />
            {quest && (
              <section className="rounded-lg border border-red-100 bg-white p-5">
                <Button tone="danger" onClick={() => setDeleting(true)}>{cc.questEditor.delete}</Button>
                {deleting && (
                  <ConfirmDialog
                    title={cc.questEditor.deleteTitle}
                    confirmLabel={cc.questEditor.deleteForGood}
                    typeToConfirm={quest.title}
                    onConfirm={remove}
                    onClose={() => setDeleting(false)}
                  >
                    {onItNow > 0 && <p className="mb-2">{cc.questEditor.deleteMovesTeams({ n: onItNow })}</p>}
                    {cc.questEditor.deleteBody}
                  </ConfirmDialog>
                )}
              </section>
            )}
          </div>

          {/* The phone stays in view while the form scrolls past */}
          <aside ref={phoneRoom.aside} className="space-y-3 lg:sticky lg:top-0">
            <div className="flex flex-wrap justify-center gap-1">
              {moments.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMoment(m)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    m === shown ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cc.questEditor.moments[m]}
                </button>
              ))}
            </div>
            <div ref={phoneRoom.phone}>
              <PhonePreview scene={scene} maxHeight={phoneRoom.height} />
            </div>
            <p className="text-center text-xs text-gray-500">
              <Link to={to.settings(game.id)} className="underline hover:text-gray-900">{cc.questEditor.changeTheme}</Link>
            </p>
          </aside>
        </div>
      )}
    </Page>
  );
}

// How tall the phone may be so the whole of it stays in view beside the form
// as it scrolls: the page's visible height, less the page's padding and the
// rest of the column. Only on screens wide enough for the two columns.
function usePhoneRoom(view: string) {
  const aside = useRef<HTMLElement>(null);
  const phone = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>();
  useLayoutEffect(() => {
    const measure = () => {
      const main = aside.current?.closest('main');
      if (!main || !aside.current || !phone.current || window.innerWidth < 1024) return setHeight(undefined);
      const style = getComputedStyle(main);
      const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const rest = aside.current.offsetHeight - phone.current.offsetHeight;
      setHeight(main.clientHeight - padding - rest);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [view]);
  return { aside, phone, height };
}
