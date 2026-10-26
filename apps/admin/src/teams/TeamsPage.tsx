import { useState, type FormEvent, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { consoleCopy as cc, MAX_TEAMS_PER_GAME, TEAM_COLORS } from '@grandcityrace/shared';
import Icon from '../components/Icon';
import { useGame } from '../data/games';
import { dataOr } from '../data/live';
import { usePlayers, type HostPlayer } from '../data/players';
import { useTeams, type HostTeam } from '../data/teams';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Dialog } from '../ui/Dialog';
import { Field, TextInput } from '../ui/Field';
import { PlayerLink, TeamDot, TeamLink } from '../ui/EntityLink';
import { Page } from '../ui/Page';
import { Empty, Show } from '../ui/States';
import { host } from '../utils/api';

const TEAM_NAME_LENGTH = 40;
// Where a player is dropped to take them off their team
const NO_TEAM = '__none';

// Who plays on which team: players are dragged between teams, and teams made,
// renamed and deleted. Every change goes through the server.
export default function TeamsPage() {
  const { gameId } = useParams();
  const game = dataOr(useGame(gameId), null);
  const teamsLive = useTeams(gameId);
  const players = dataOr(usePlayers(gameId), [] as HostPlayer[]);
  // A move shows at once, before the server's answer arrives
  const [moved, setMoved] = useState<{ uid: string; teamId: string | null } | null>(null);
  const [editing, setEditing] = useState<HostTeam | 'new' | null>(null);
  const [dragging, setDragging] = useState<HostPlayer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const teamOf = (p: HostPlayer) => (moved?.uid === p.uid ? moved.teamId : p.teamId);
  const maxTeamSize = game?.maxTeamSize;

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setMoved(null);
    }
  }

  function move(player: HostPlayer, teamId: string | null) {
    if (teamOf(player) === teamId) return;
    setMoved({ uid: player.uid, teamId });
    run(() => host('movePlayer', { gameId, uid: player.uid, teamId }));
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setDragging(null);
    const player = players.find(p => p.uid === active.id);
    if (!player || !over) return;
    const teamId = over.id === NO_TEAM ? null : String(over.id);
    const full = teamId && maxTeamSize && players.filter(p => teamOf(p) === teamId).length >= maxTeamSize;
    if (!full) move(player, teamId);
  }

  return (
    <Page
      wide
      title={cc.teamsPage.teams}
      actions={
        <Button tone="primary" onClick={() => setEditing('new')} disabled={dataOr(teamsLive, []).length >= MAX_TEAMS_PER_GAME}>
          {cc.teamsPage.newTeam}
        </Button>
      }
    >
      {error && <p className="mb-4 text-sm text-red-600" role="alert">{error}</p>}
      <AddPlayer gameId={gameId!} run={run} />

      <Show live={teamsLive}>
        {teams => {
          const unassigned = players.filter(p => !teamOf(p) || !teams.some(t => t.id === teamOf(p)));
          if (teams.length === 0 && unassigned.length === 0) return <Empty title={cc.teamsPage.noTeamsYetCreateThe} />;
          return (
            <DndContext
              sensors={sensors}
              onDragStart={({ active }) => setDragging(players.find(p => p.uid === active.id) ?? null)}
              onDragCancel={() => setDragging(null)}
              onDragEnd={onDragEnd}
            >
              <div className="space-y-8">
                {teams.length > 0 && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[...teams].sort((a, b) => a.name.localeCompare(b.name)).map(team => (
                      <TeamCard
                        key={team.id}
                        team={team}
                        members={players.filter(p => teamOf(p) === team.id)}
                        maxTeamSize={maxTeamSize}
                        onEdit={() => setEditing(team)}
                        onRemove={p => move(p, null)}
                      />
                    ))}
                  </div>
                )}
                <Unassigned players={unassigned} hasTeams={teams.length > 0} />
              </div>
              <DragOverlay>
                {dragging && (
                  <div className="flex cursor-grabbing items-center gap-2 rounded-lg border-2 border-gray-900 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-lg">
                    <span className="text-xs text-gray-400">⠿</span>
                    {dragging.name}
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          );
        }}
      </Show>

      {editing && (
        <TeamDialog
          gameId={gameId!}
          team={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Page>
  );
}

// Someone with an account put in the game without typing the code
function AddPlayer({ gameId, run }: { gameId: string; run: (action: () => Promise<unknown>) => Promise<boolean> }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  async function add(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    if (await run(() => host('addPlayer', { gameId, email: email.trim() }))) setEmail('');
    setBusy(false);
  }
  return (
    <form onSubmit={add} className="mb-8 max-w-md space-y-1">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <TextInput type="email" value={email} maxLength={200} onChange={e => setEmail(e.target.value)} placeholder={cc.teamsPage.addPlayerByEmail} aria-label={cc.teamsPage.addPlayerByEmail} />
        </div>
        <Button type="submit" disabled={!email.trim() || busy}>{cc.teamsPage.addPlayer}</Button>
      </div>
      <p className="text-xs text-gray-400">{cc.teamsPage.addPlayerHelp}</p>
    </form>
  );
}

function TeamCard({ team, members, maxTeamSize, onEdit, onRemove }: {
  team: HostTeam;
  members: HostPlayer[];
  maxTeamSize?: number;
  onEdit: () => void;
  onRemove: (player: HostPlayer) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: team.id });
  const full = !!maxTeamSize && members.length >= maxTeamSize;
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border-2 bg-white p-4 transition-colors ${isOver ? (full ? 'border-red-400' : 'border-gray-900') : 'border-gray-200'}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <TeamLink id={team.id} name={team.name} color={team.color} />
        {maxTeamSize && <span className="text-xs text-gray-400">{members.length}/{maxTeamSize}</span>}
        <Button size="small" tone="quiet" className="ml-auto" onClick={onEdit}>{cc.teamsPage.edit}</Button>
      </div>
      <ul className="min-h-8 space-y-1">
        {members.length === 0 && <li className="text-sm italic text-gray-300">{cc.teamsPage.dropPlayersHere}</li>}
        {members.map(p => (
          <Draggable key={p.uid} player={p}>
            {handle => (
              <li className="flex items-center gap-1.5 py-0.5 text-sm text-gray-700">
                {handle}
                <PlayerLink uid={p.uid} name={p.name} />
                <button type="button" onClick={() => onRemove(p)} title={cc.teamsPage.takeOff} aria-label={cc.teamsPage.takeOff} className="ml-auto text-gray-300 hover:text-red-500">
                  <Icon name="close" size={14} />
                </button>
              </li>
            )}
          </Draggable>
        ))}
      </ul>
      {full && isOver && <p className="mt-2 text-xs text-red-500">{cc.teamsPage.teamIsFull}</p>}
    </div>
  );
}

// Players without a team, who can be dragged onto one; dropping a player
// here takes them off theirs
function Unassigned({ players, hasTeams }: { players: HostPlayer[]; hasTeams: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: NO_TEAM });
  if (!hasTeams && players.length === 0) return null;
  return (
    <section ref={setNodeRef} className={`rounded-lg border-2 border-dashed p-4 ${isOver ? 'border-gray-900' : 'border-gray-200'}`}>
      <h2 className="mb-3 text-sm font-medium text-gray-500">
        {cc.teamsPage.withoutATeam}
        {hasTeams && players.length > 0 && <span className="ml-1 font-normal text-gray-400">{cc.teamsPage.dragIntoATeam}</span>}
      </h2>
      {players.length === 0 ? (
        <p className="text-sm text-gray-300">{cc.teamsPage.everyoneHasATeam}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {players.map(p => (
            <Draggable key={p.uid} player={p}>
              {handle => (
                <li className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                  {handle}
                  <PlayerLink uid={p.uid} name={p.name} />
                </li>
              )}
            </Draggable>
          ))}
        </ul>
      )}
    </section>
  );
}

// A player who can be picked up by their handle
function Draggable({ player, children }: { player: HostPlayer; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: player.uid });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform) }} className={isDragging ? 'opacity-40' : ''}>
      {children(
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={cc.teamsPage.dragToMove({ name: player.name })}
          style={{ touchAction: 'none' }}
          className="cursor-grab select-none text-xs text-gray-300 hover:text-gray-500 active:cursor-grabbing"
        >
          ⠿
        </button>,
      )}
    </div>
  );
}

// Making a team, or changing its name and colour
function TeamDialog({ gameId, team, onClose }: { gameId: string; team: HostTeam | null; onClose: () => void }) {
  const [name, setName] = useState(team?.name ?? '');
  const [color, setColor] = useState(team?.color ?? TEAM_COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function save(e?: FormEvent) {
    e?.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await (team
        ? host('updateTeam', { gameId, teamId: team.id, name: name.trim(), color })
        : host('createTeam', { gameId, name: name.trim(), color }));
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (deleting && team) {
    return (
      <ConfirmDialog
        title={cc.teamsPage.deleteThisTeam}
        confirmLabel={cc.teamsPage.deleteTeam}
        typeToConfirm={team.name}
        onConfirm={async () => { await host('deleteTeam', { gameId, teamId: team.id }); onClose(); }}
        onClose={() => setDeleting(false)}
      >
        {cc.teamsPage.allMembersWillBeUnassigned}
      </ConfirmDialog>
    );
  }

  return (
    <Dialog
      title={team ? cc.teamsPage.editTeam : cc.teamsPage.newTeam}
      busy={busy}
      onClose={onClose}
      footer={<>
        {team && <Button tone="danger" className="mr-auto" disabled={busy} onClick={() => setDeleting(true)}>{cc.teamsPage.delete}</Button>}
        <Button tone="quiet" disabled={busy} onClick={onClose}>{cc.teamsPage.cancel}</Button>
        <Button tone="primary" disabled={!name.trim() || busy} onClick={() => save()}>{busy ? cc.teamsPage.saving : cc.teamsPage.saveTeam}</Button>
      </>}
    >
      <form onSubmit={save} className="space-y-4">
        <Field label={cc.teamsPage.name}>
          {id => <TextInput id={id} autoFocus value={name} maxLength={TEAM_NAME_LENGTH} onChange={e => setName(e.target.value)} placeholder={cc.teamsPage.eGTeamAlpha} />}
        </Field>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">{cc.teamsPage.color}</p>
          <div className="flex flex-wrap items-center gap-2">
            {TEAM_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                aria-pressed={color === c}
                className={`rounded-full p-0.5 ${color === c ? 'ring-2 ring-gray-900' : ''}`}
              >
                <TeamDot color={c} size={24} />
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      </form>
    </Dialog>
  );
}
