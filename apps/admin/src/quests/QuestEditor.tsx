import type { ReactNode } from 'react';
import {
  consoleCopy as cc, type AnswerAttempt, type ContentBlock, type GeoPoint, type PreviewMoment, type Quest, type QuestTask, type QuestTrigger,
} from '@grandcityrace/shared';
import ContentBlocksEditor from '../components/ContentBlocksEditor';
import Icon from '../components/Icon';
import LocationPicker from '../components/LocationPicker';
import { Choice } from '../ui/Choice';
import { QuestLink } from '../ui/EntityLink';
import { Field, TextInput } from '../ui/Field';
import { Toggle } from '../ui/Toggle';
import { TASK_OPTIONS, TRIGGER_OPTIONS } from '../utils/questOptions';
import type { EditorBlock, FormErrors, QuestForm } from './questForm';

const MAX_TITLE = 80;
const MAX_ANSWER = 100;

type Update = (change: Partial<QuestForm> | ((form: QuestForm) => Partial<QuestForm>)) => void;

// A numbered part of the quest, in the order teams live it. Working in it
// turns the phone to that moment.
function Step({ title, onFocus, children }: { title: string; onFocus: () => void; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5" onFocusCapture={onFocus}>
      <h2 className="mb-4 text-base font-semibold text-gray-900">{title}</h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Blocks({ label, help, error, blocks, placeholder, onChange }: {
  label: string; help?: string; error?: string; blocks: EditorBlock[]; placeholder: string; onChange: (blocks: EditorBlock[]) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <ContentBlocksEditor blocks={blocks} onChange={onChange} textPlaceholder={placeholder} hasError={!!error} />
      {error ? <p className="text-xs text-red-600">{error}</p> : help ? <p className="text-xs text-gray-400">{help}</p> : null}
    </div>
  );
}

// The end of the quest before, so a chain of quests reads as a chain
function PreviousEnding({ previous }: { previous: { quest: Quest; number: number } | null }) {
  if (!previous) return <p className="text-sm text-gray-500">{cc.questEditor.firstQuest}</p>;
  const text = previous.quest.description.filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text').map(b => b.text).join(' ');
  return (
    <div className="rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm">
      <p className="mb-1 text-xs text-gray-500">
        <QuestLink id={previous.quest.id}>{cc.questEditor.previousEnds({ n: previous.number })}</QuestLink>
      </p>
      <p className="line-clamp-3 text-gray-700">{text || previous.quest.title}</p>
    </div>
  );
}

// Wrong answers teams typed, most-tried first, to accept the ones that were right after all
function WrongAnswers({ attempts, answers, onAccept }: { attempts: AnswerAttempt[]; answers: string[]; onAccept: (text: string) => void }) {
  const groups = new Map<string, { text: string; count: number; teams: Set<string> }>();
  for (const a of attempts) {
    const key = a.text.trim().toLowerCase();
    if (!key) continue;
    const group = groups.get(key) ?? { text: a.text.trim(), count: 0, teams: new Set<string>() };
    group.count += 1;
    group.teams.add(a.teamName);
    groups.set(key, group);
  }
  if (groups.size === 0) return null;
  const accepted = new Set(answers.map(a => a.trim().toLowerCase()));
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-gray-700">{cc.questEditor.wrongAnswers}</p>
      <ul className="max-h-56 space-y-1 overflow-y-auto">
        {[...groups.values()].sort((a, b) => b.count - a.count).map(group => (
          <li key={group.text} className="flex items-center gap-2 text-sm">
            <span className="flex-1 truncate font-mono text-gray-700" title={[...group.teams].join(', ')}>
              {group.text} <span className="font-sans text-gray-400">×{group.count}</span>
            </span>
            {accepted.has(group.text.toLowerCase()) ? (
              <span className="shrink-0 text-xs text-green-600">{cc.questEditor.accepted}</span>
            ) : (
              <button type="button" onClick={() => onAccept(group.text)} className="shrink-0 text-xs text-gray-500 hover:text-gray-900">
                {cc.questEditor.accept}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// The quest the way teams live it: how they find the place, then what they
// read and do there
export function QuestEditor({ form, update, errors, previous, cityCoordinates, hintCost, attempts, hintsBoughtBy, onMoment }: {
  form: QuestForm;
  update: Update;
  errors: FormErrors;
  previous: { quest: Quest; number: number } | null;
  cityCoordinates?: GeoPoint;
  hintCost: number;
  attempts: AnswerAttempt[];
  hintsBoughtBy: number[]; // teams that bought each saved hint
  onMoment: (moment: PreviewMoment) => void; // the moment of the quest being worked on, for the phone
}) {
  const setAt = <K extends 'answers' | 'hints'>(field: K, index: number, value: QuestForm[K][number]) =>
    update(f => ({ [field]: f[field].map((item, i) => (i === index ? value : item)) }));
  const removeAt = (field: 'answers' | 'hints', index: number) =>
    update(f => ({ [field]: f[field].filter((_, i) => i !== index) }));

  return (
    <div className="space-y-6">
      {/* Whether the quest is played at all comes before everything in it */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <Toggle on={form.isActive} onChange={isActive => update({ isActive })} label={cc.questEditor.inRace} help={cc.questEditor.inRaceHelp} />
      </section>

      <PreviousEnding previous={previous} />

      <Step title={cc.questEditor.onTheWay} onFocus={() => onMoment('onTheWay')}>
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-700">{cc.questEditor.unlocks}</p>
          <Choice
            label={cc.questEditor.unlocks}
            options={TRIGGER_OPTIONS as { value: QuestTrigger; label: string; help: string }[]}
            value={form.trigger}
            onChange={trigger => update({ trigger })}
          />
        </div>

        {form.trigger === 'none' ? (
          <p className="text-sm text-gray-500">{cc.questEditor.rightAway}</p>
        ) : (
          <Blocks
            label={cc.questEditor.navigationHint}
            help={cc.questEditor.navigationHintHelp}
            error={errors.navigationHint}
            blocks={form.navigationHint}
            placeholder={form.trigger === 'location' ? cc.questEditor.navigationPlaceholder : cc.questEditor.distancePlaceholder}
            onChange={navigationHint => update({ navigationHint })}
          />
        )}

        {form.trigger === 'location' && (
          <>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-700">{cc.questEditor.place}</p>
              <LocationPicker
                value={form.location}
                onChange={(location: QuestForm['location']) => update({ location })}
                defaultCenter={cityCoordinates}
                fenceRadius={parseFloat(form.fenceRadius) || 0}
              />
              {errors.location && <p className="text-xs text-red-600">{errors.location}</p>}
            </div>
            <Field label={cc.questEditor.fence} help={cc.questEditor.fenceHelp} error={errors.fenceRadius}>
              {id => (
                <div className="w-32">
                  <TextInput id={id} type="number" min={1} maxLength={6} value={form.fenceRadius} onChange={e => update({ fenceRadius: e.target.value })} />
                </div>
              )}
            </Field>
          </>
        )}

        {form.trigger === 'distance' && (
          <>
            <Field label={cc.questEditor.distance} error={errors.distanceMeters}>
              {id => (
                <div className="w-32">
                  <TextInput id={id} type="number" min={1} maxLength={6} value={form.distanceMeters} onChange={e => update({ distanceMeters: e.target.value })} />
                </div>
              )}
            </Field>
            <Toggle
              on={form.showDistanceProgress}
              onChange={showDistanceProgress => update({ showDistanceProgress })}
              label={cc.questEditor.showProgress}
             
            />
          </>
        )}
      </Step>

      <Step title={cc.questEditor.whenTheyArrive} onFocus={() => onMoment('arrived')}>
        <Field label={cc.questEditor.title} error={errors.title}>
          {id => <TextInput id={id} maxLength={MAX_TITLE} value={form.title} onChange={e => update({ title: e.target.value })} />}
        </Field>

        <Blocks
          label={cc.questEditor.text}
          error={errors.description}
          blocks={form.description}
          placeholder={cc.questEditor.textPlaceholder}
          onChange={description => update({ description })}
        />

        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-700">{cc.questEditor.then}</p>
          <Choice
            label={cc.questEditor.then}
            options={TASK_OPTIONS as { value: QuestTask; label: string; help: string }[]}
            value={form.task}
            onChange={task => update({ task })}
          />
        </div>

        {form.task === 'timer' && (
          <Field label={cc.questEditor.minutes} error={errors.durationMinutes}>
            {id => (
              <div className="w-32">
                <TextInput id={id} type="number" min={0.5} step={0.5} maxLength={5} value={form.durationMinutes} onChange={e => update({ durationMinutes: e.target.value })} />
              </div>
            )}
          </Field>
        )}

        {form.task === 'answer' && (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">{cc.questEditor.answers}</p>
              {form.answers.map((answer, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    aria-label={cc.questEditor.answer({ n: i + 1 })}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${errors.answers ? 'border-red-400' : 'border-gray-300'}`}
                    maxLength={MAX_ANSWER}
                    value={answer}
                    placeholder={cc.questEditor.answer({ n: i + 1 })}
                    onChange={e => setAt('answers', i, e.target.value)}
                  />
                  {form.answers.length > 1 && (
                    <button type="button" title={cc.questEditor.removeAnswer} onClick={() => removeAt('answers', i)} className="shrink-0 text-gray-300 hover:text-red-500">
                      <Icon name="close" size={14} />
                    </button>
                  )}
                </div>
              ))}
              {errors.answers ? <p className="text-xs text-red-600">{errors.answers}</p> : <p className="text-xs text-gray-400">{cc.questEditor.answersHelp}</p>}
              <button type="button" onClick={() => update(f => ({ answers: [...f.answers, ''] }))} className="text-xs text-gray-500 hover:text-gray-900">
                {cc.questEditor.addAnswer}
              </button>
            </div>

            <WrongAnswers
              attempts={attempts}
              answers={form.answers}
              onAccept={text => update(f => ({ answers: [...f.answers.filter(a => a.trim()), text] }))}
            />

            {/* Inside step 2, so it turns the phone after the step does */}
            <div className="space-y-2" onFocusCapture={() => onMoment('hint')}>
              <p className="text-sm font-medium text-gray-700">{cc.questEditor.hints}</p>
              <p className="text-xs text-gray-400">{cc.questEditor.hintsHelp({ price: hintCost })}</p>
              {form.hints.map((hint, i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-3">
                  <div className="mb-2 flex items-center">
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{cc.questEditor.hint({ n: i + 1 })}</span>
                    {hintsBoughtBy[i] !== undefined && (
                      <span className="ml-2 text-xs text-gray-400">· {cc.questEditor.boughtBy({ n: hintsBoughtBy[i] })}</span>
                    )}
                    <button type="button" title={cc.questEditor.removeHint} onClick={() => removeAt('hints', i)} className="ml-auto text-gray-300 hover:text-red-500">
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                  <ContentBlocksEditor blocks={hint} onChange={(blocks: EditorBlock[]) => setAt('hints', i, blocks)} textPlaceholder={cc.questEditor.hintPlaceholder({ n: i + 1 })} />
                </div>
              ))}
              {errors.hints && <p className="text-xs text-red-600">{errors.hints}</p>}
              <button type="button" onClick={() => update(f => ({ hints: [...f.hints, [{ type: 'text', text: '' }]] }))} className="text-xs text-gray-500 hover:text-gray-900">
                {cc.questEditor.addHint}
              </button>
            </div>
          </>
        )}
      </Step>
    </div>
  );
}
