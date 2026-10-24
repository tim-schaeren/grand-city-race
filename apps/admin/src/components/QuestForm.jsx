import { rich } from '../utils/rich';
import { consoleCopy as cc } from '@grandcityrace/shared';
import { useState, useEffect } from 'react';
import { hasContent } from '@grandcityrace/shared';
import LocationPicker from './LocationPicker';
import ContentBlocksEditor from './ContentBlocksEditor';
import {
	toEditorBlocks,
	toContentBlocks,
	blockErrors,
} from '../utils/contentBlocks';
import { TRIGGER_OPTIONS, TASK_OPTIONS } from '../utils/questOptions';
import Icon from './Icon';

const EMPTY = {
	title: '',
	trigger: 'location',
	task: 'answer',
	description: [{ type: 'text', text: '' }],
	navigationHint: [{ type: 'text', text: '' }],
	fenceRadius: '50',
	location: { lat: '', lng: '' },
	distanceMeters: '500',
	durationMinutes: '15',
	answers: [''],
	hints: [[{ type: 'text', text: '' }]],
	showDistanceProgress: true,
	isActive: true,
};

function toFormState(quest) {
	if (!quest) return EMPTY;
	return {
		title: quest.title,
		trigger: quest.trigger,
		task: quest.task,
		description: quest.description.length
			? toEditorBlocks(quest.description)
			: EMPTY.description,
		navigationHint: quest.navigationHint.length
			? toEditorBlocks(quest.navigationHint)
			: EMPTY.navigationHint,
		fenceRadius: String(quest.fenceRadius ?? 50),
		location: {
			lat: String(quest.location?.lat ?? ''),
			lng: String(quest.location?.lng ?? ''),
		},
		distanceMeters: String(quest.distanceMeters ?? 500),
		durationMinutes: String(
			quest.durationSeconds != null ? quest.durationSeconds / 60 : 15,
		),
		answers: quest.answers?.length ? quest.answers : [''],
		hints: quest.hints?.length
			? quest.hints.map((hint) => toEditorBlocks(hint.blocks))
			: EMPTY.hints,
		showDistanceProgress: quest.showDistanceProgress !== false,
		isActive: quest.isActive,
	};
}

function SegmentedControl({ options, value, onChange }) {
	return (
		<div>
			<div className="inline-flex rounded-lg border border-gray-300 p-0.5 bg-gray-50">
				{options.map((o) => (
					<button
						key={o.value}
						onClick={() => onChange(o.value)}
						className={`px-3 py-1.5 text-sm rounded-md transition-colors ${value === o.value ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}
					>
						{o.label}
					</button>
				))}
			</div>
			<p className="text-xs text-gray-400 mt-1">
				{options.find((o) => o.value === value)?.help}
			</p>
		</div>
	);
}

// Wrong answers for this quest, most-tried first, with who tried them
function summarizeAttempts(attempts) {
	const groups = new Map();
	for (const attempt of attempts) {
		const key = attempt.text?.trim().toLowerCase();
		if (!key) continue;
		const group = groups.get(key) ?? {
			text: attempt.text.trim(),
			count: 0,
			teams: new Set(),
		};
		group.count += 1;
		group.teams.add(attempt.teamName || attempt.teamId);
		groups.set(key, group);
	}
	return [...groups.values()].sort((a, b) => b.count - a.count);
}

export default function QuestForm({
	quest,
	existingTitles,
	cityCoordinates,
	attempts = [],
	onSave,
	onCancel,
	onDelete,
	onDirtyChange,
	saving,
}) {
	const [form, setForm] = useState(() => toFormState(quest));
	const [errors, setErrors] = useState({});
	const [confirming, setConfirming] = useState(false);
	const [deleteInput, setDeleteInput] = useState('');

	useEffect(() => {
		setForm(toFormState(quest));
		setErrors({});
		setConfirming(false);
		setDeleteInput('');
	}, [quest?.id]);

	useEffect(() => {
		const original = JSON.stringify(toFormState(quest));
		const current = JSON.stringify(form);
		onDirtyChange?.(original !== current);
	}, [form]);

	function set(field, value) {
		setForm((f) => ({ ...f, [field]: value }));
	}

	function setArrayItem(field, index, value) {
		setForm((f) => {
			const arr = [...f[field]];
			arr[index] = value;
			return { ...f, [field]: arr };
		});
	}

	function addArrayItem(field) {
		setForm((f) => ({ ...f, [field]: [...f[field], ''] }));
	}

	function removeArrayItem(field, index) {
		setForm((f) => ({ ...f, [field]: f[field].filter((_, i) => i !== index) }));
	}

	function validate() {
		const e = {};
		if (!form.title.trim()) e.title = cc.questForm.titleIsRequired;
		else if (
			existingTitles?.includes(form.title.trim()) &&
			form.title.trim() !== quest?.title
		) {
			e.title = cc.questForm.aQuestWithThisTitle;
		}
		e.description =
			blockErrors(form.description) ??
			(hasContent(toContentBlocks(form.description))
				? undefined
				: cc.questForm.descriptionIsRequired);

		if (form.trigger === 'location') {
			e.navigationHint =
				blockErrors(form.navigationHint) ??
				(hasContent(toContentBlocks(form.navigationHint))
					? undefined
					: cc.questForm.navigationHintIsRequired);
			const radius = parseFloat(form.fenceRadius);
			if (isNaN(radius) || radius <= 0)
				e.fenceRadius = cc.questForm.fenceRadiusMustBeA;
			const lat = parseFloat(form.location.lat);
			const lng = parseFloat(form.location.lng);
			if (
				isNaN(lat) ||
				isNaN(lng) ||
				!form.location.lat ||
				!form.location.lng
			) {
				e.location = cc.questForm.aValidLocationIsRequired;
			}
		}

		if (form.trigger === 'distance') {
			e.navigationHint = blockErrors(form.navigationHint) ?? undefined;
			const meters = parseFloat(form.distanceMeters);
			if (isNaN(meters) || meters <= 0)
				e.distanceMeters = cc.questForm.distanceMustBeAPositive;
		}

		if (form.task === 'answer') {
			const answers = form.answers.map((a) => a.trim()).filter(Boolean);
			if (answers.length === 0) e.answers = cc.questForm.atLeastOneAnswerIs;
		}

		if (form.task === 'timer') {
			const minutes = parseFloat(form.durationMinutes);
			if (isNaN(minutes) || minutes <= 0)
				e.durationMinutes = cc.questForm.durationMustBeAPositive;
		}

		Object.keys(e).forEach((k) => e[k] === undefined && delete e[k]);
		setErrors(e);
		return Object.keys(e).length === 0;
	}

	// Only fields relevant to the chosen trigger/task are saved (the quest doc is replaced on save)
	function handleSave() {
		if (!validate()) return;
		const data = {
			title: form.title.trim(),
			trigger: form.trigger,
			task: form.task,
			description: toContentBlocks(form.description),
			navigationHint:
				form.trigger === 'none' ? [] : toContentBlocks(form.navigationHint),
			isActive: form.isActive,
		};
		if (form.trigger === 'location') {
			data.fenceRadius = parseFloat(form.fenceRadius);
			data.location = {
				lat: parseFloat(form.location.lat),
				lng: parseFloat(form.location.lng),
			};
		}
		if (form.trigger === 'distance') {
			data.distanceMeters = parseFloat(form.distanceMeters);
			data.showDistanceProgress = form.showDistanceProgress;
		}
		if (form.task === 'answer') {
			data.answers = form.answers.map((a) => a.trim()).filter(Boolean);
			// Each hint is stored as a map: Firestore rejects an array of arrays
			data.hints = form.hints
				.map((hint) => toContentBlocks(hint))
				.filter((blocks) => blocks.length > 0)
				.map((blocks) => ({ blocks }));
		}
		if (form.task === 'timer') {
			data.durationSeconds = Math.round(parseFloat(form.durationMinutes) * 60);
		}
		onSave(data);
	}

	const deleteConfirmed = deleteInput === quest?.title;

	return (
		<div className="flex flex-col h-full">
			<div className="px-6 py-4 border-b border-gray-200">
				<h2 className="text-base font-semibold text-gray-900">
					{quest ? cc.questForm.editQuest : cc.questForm.newQuest}
				</h2>
			</div>

			<div className="flex-1 overflow-y-auto space-y-5 px-6 py-5">
				{confirming ? (
					<div className="space-y-4">
						<div className="bg-red-50 border border-red-200 rounded-lg p-4">
							<p className="text-sm font-semibold text-red-700 mb-1">
								{cc.questForm.deleteThisQuest}
							</p>
							<p className="text-sm text-red-600">
								{rich(cc.questForm.thisWillPermanentlyDeleteThis({ span: <span className="font-medium">{quest.title}</span> }))}
							</p>
						</div>
						<div>
							<label className="block text-sm text-gray-700 mb-1">
								{rich(cc.questForm.typeToConfirm({ span: <span className="font-semibold">{quest.title}</span> }))}
							</label>
							<input
								className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
								value={deleteInput}
								onChange={(e) => setDeleteInput(e.target.value)}
								placeholder={quest.title}
								autoFocus
							/>
						</div>
					</div>
				) : (
					<>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								{cc.questForm.title}
							</label>
							<input
								className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${errors.title ? 'border-red-400' : 'border-gray-300'}`}
								value={form.title}
								onChange={(e) => set('title', e.target.value)}
								placeholder={cc.questForm.questTitle}
							/>
							{errors.title && (
								<p className="text-xs text-red-500 mt-1">{errors.title}</p>
							)}
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								{cc.questForm.trigger}
							</label>
							<SegmentedControl
								options={TRIGGER_OPTIONS}
								value={form.trigger}
								onChange={(v) => set('trigger', v)}
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								{cc.questForm.task}
							</label>
							<SegmentedControl
								options={TASK_OPTIONS}
								value={form.task}
								onChange={(v) => set('task', v)}
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								{cc.questForm.description}
							</label>
							<ContentBlocksEditor
								blocks={form.description}
								onChange={(blocks) => set('description', blocks)}
								textPlaceholder={
									form.task === 'answer'
										? cc.questForm.descriptionAnswer
										: form.task === 'timer'
											? cc.questForm.descriptionTimer
											: cc.questForm.descriptionContinue
								}
								hasError={!!errors.description}
							/>
							{errors.description && (
								<p className="text-xs text-red-500 mt-1">
									{errors.description}
								</p>
							)}
						</div>

						{form.trigger !== 'none' && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									{rich(cc.questForm.navigationHint({ formTrigger: form.trigger === 'distance' && (
										<span className="font-normal text-gray-400">
											{cc.questForm.optional}
										</span>
									) }))}
								</label>
								<ContentBlocksEditor
									blocks={form.navigationHint}
									onChange={(blocks) => set('navigationHint', blocks)}
									textPlaceholder={
										form.trigger === 'location'
											? cc.questForm.navigationLocation
											: cc.questForm.navigationDistance
									}
									hasError={!!errors.navigationHint}
								/>
								{errors.navigationHint && (
									<p className="text-xs text-red-500 mt-1">
										{errors.navigationHint}
									</p>
								)}
							</div>
						)}

						{form.trigger === 'location' && (
							<>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										{cc.questForm.fenceRadiusMeters}
									</label>
									<input
										type="number"
										min="1"
										className={`w-32 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${errors.fenceRadius ? 'border-red-400' : 'border-gray-300'}`}
										value={form.fenceRadius}
										onChange={(e) => set('fenceRadius', e.target.value)}
										placeholder="50"
									/>
									{errors.fenceRadius && (
										<p className="text-xs text-red-500 mt-1">
											{errors.fenceRadius}
										</p>
									)}
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										{cc.questForm.location}
									</label>
									<LocationPicker
										value={form.location}
										onChange={(loc) => set('location', loc)}
										defaultCenter={cityCoordinates}
										fenceRadius={parseFloat(form.fenceRadius) || 0}
									/>
									{errors.location && (
										<p className="text-xs text-red-500 mt-1">
											{errors.location}
										</p>
									)}
								</div>
							</>
						)}

						{form.trigger === 'distance' && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									{cc.questForm.distanceMeters}
								</label>
								<input
									type="number"
									min="1"
									className={`w-32 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${errors.distanceMeters ? 'border-red-400' : 'border-gray-300'}`}
									value={form.distanceMeters}
									onChange={(e) => set('distanceMeters', e.target.value)}
									placeholder="500"
								/>
								<p className="text-xs text-gray-400 mt-1">
									{cc.questForm.measuredByGpsFromWhen}
								</p>
								{errors.distanceMeters && (
									<p className="text-xs text-red-500 mt-1">
										{errors.distanceMeters}
									</p>
								)}

								<div className="flex items-center gap-3 mt-4">
									<button
										onClick={() =>
											set('showDistanceProgress', !form.showDistanceProgress)
										}
										className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${form.showDistanceProgress ? 'bg-gray-900' : 'bg-gray-200'}`}
									>
										<span
											className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.showDistanceProgress ? 'translate-x-4' : ''}`}
										/>
									</button>
									<div>
										<span className="text-sm text-gray-700">{cc.questForm.showProgress}</span>
										<p className="text-xs text-gray-400">
											{cc.questForm.offHidesTheBarAnd}
										</p>
									</div>
								</div>
							</div>
						)}

						{form.task === 'timer' && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									{cc.questForm.durationMinutes}
								</label>
								<input
									type="number"
									min="0.5"
									step="0.5"
									className={`w-32 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${errors.durationMinutes ? 'border-red-400' : 'border-gray-300'}`}
									value={form.durationMinutes}
									onChange={(e) => set('durationMinutes', e.target.value)}
									placeholder="15"
								/>
								<p className="text-xs text-gray-400 mt-1">
									{cc.questForm.gamePausesDonTCount}
								</p>
								{errors.durationMinutes && (
									<p className="text-xs text-red-500 mt-1">
										{errors.durationMinutes}
									</p>
								)}
							</div>
						)}

						{form.task === 'answer' && (
							<>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										{cc.questForm.validAnswers}
									</label>
									<div className="space-y-2">
										{form.answers.map((answer, i) => (
											<div key={i} className="flex gap-2 items-center">
												<input
													className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${errors.answers ? 'border-red-400' : 'border-gray-300'}`}
													value={answer}
													onChange={(e) =>
														setArrayItem('answers', i, e.target.value)
													}
													placeholder={cc.questForm.answer({ i: i + 1 })}
												/>
												{form.answers.length > 1 && (
													<button
														onClick={() => removeArrayItem('answers', i)}
														className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
													>
														<Icon name="close" size={14} />
													</button>
												)}
											</div>
										))}
										{errors.answers && (
											<p className="text-xs text-red-500">{errors.answers}</p>
										)}
										<button
											onClick={() => addArrayItem('answers')}
											className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
										>
											{cc.questForm.addAnswer}
										</button>
									</div>
								</div>

								{attempts.length > 0 && (
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											{rich(cc.questForm.rejectedAnswers({ span: <span className="font-normal text-gray-400">
												({attempts.length})
											</span> }))}
										</label>
										<p className="text-xs text-gray-400 mb-2">
											{cc.questForm.acceptToAddAsValid}
										</p>
										<div className="space-y-1 max-h-56 overflow-y-auto">
											{summarizeAttempts(attempts).map((group) => {
												const alreadyAccepted = form.answers.some(
													(a) =>
														a.trim().toLowerCase() === group.text.toLowerCase(),
												);
												return (
													<div
														key={group.text}
														className="flex items-center gap-2 text-sm"
													>
														<span
															className="flex-1 truncate text-gray-700"
															title={[...group.teams].join(', ')}
														>
															{group.text}
															<span className="text-gray-400">
																{' '}
																×{group.count}
															</span>
														</span>
														{alreadyAccepted ? (
															<span className="text-xs text-green-600 shrink-0">
																{cc.questForm.accepted}
															</span>
														) : (
															<button
																onClick={() =>
																	setForm((f) => ({
																		...f,
																		answers: [
																			...f.answers.filter((a) => a.trim()),
																			group.text,
																		],
																	}))
																}
																className="text-xs text-gray-400 hover:text-gray-900 shrink-0 transition-colors"
															>
																{cc.questForm.accept}
															</button>
														)}
													</div>
												);
											})}
										</div>
									</div>
								)}

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										{rich(cc.questForm.hints({ span: <span className="font-normal text-gray-400">
											{cc.questForm.optional}
										</span> }))}
									</label>
									<p className="text-xs text-gray-400 mb-2">
										{cc.questForm.teamsPayCoinsToReveal}
									</p>
									<div className="space-y-3">
										{form.hints.map((hint, i) => (
											<div
												key={i}
												className="border border-gray-200 rounded-lg p-3"
											>
												<div className="flex items-center mb-2">
													<span className="text-xs font-medium uppercase tracking-wide text-gray-400">
														{cc.questForm.hint({ i: i + 1 })}
													</span>
													{form.hints.length > 1 && (
														<button
															onClick={() => removeArrayItem('hints', i)}
															className="ml-auto text-gray-300 hover:text-red-400 transition-colors"
														>
															<Icon name="close" size={14} />
														</button>
													)}
												</div>
												<ContentBlocksEditor
													blocks={hint}
													onChange={(blocks) => setArrayItem('hints', i, blocks)}
													textPlaceholder={cc.questForm.hintPlaceholder({ n: i + 1 })}
												/>
											</div>
										))}
										{errors.hints && (
											<p className="text-xs text-red-500">{errors.hints}</p>
										)}
										<button
											onClick={() =>
												setForm((f) => ({
													...f,
													hints: [...f.hints, [{ type: 'text', text: '' }]],
												}))
											}
											className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
										>
											{cc.questForm.addHint}
										</button>
									</div>
								</div>
							</>
						)}

						<div className="flex items-center gap-3">
							<button
								onClick={() => set('isActive', !form.isActive)}
								className={`relative w-10 h-6 rounded-full transition-colors ${form.isActive ? 'bg-gray-900' : 'bg-gray-200'}`}
							>
								<span
									className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-4' : ''}`}
								/>
							</button>
							<span className="text-sm text-gray-700">{cc.questForm.active}</span>
						</div>
					</>
				)}
			</div>

			<div className="border-t border-gray-200 px-6 py-4 flex items-center">
				{confirming ? (
					<>
						<button
							onClick={() => {
								setConfirming(false);
								setDeleteInput('');
							}}
							className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
						>
							{cc.questForm.back}
						</button>
						<button
							onClick={onDelete}
							disabled={!deleteConfirmed}
							className="ml-auto px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
						>
							{cc.questForm.deleteQuest}
						</button>
					</>
				) : (
					<>
						{quest && (
							<button
								onClick={() => setConfirming(true)}
								className="text-sm text-red-400 hover:text-red-600 transition-colors"
							>
								{cc.questForm.delete}
							</button>
						)}
						<div className="ml-auto flex gap-2">
							<button
								onClick={onCancel}
								className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
							>
								{cc.questForm.cancel}
							</button>
							<button
								onClick={handleSave}
								disabled={saving}
								className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
							>
								{saving ? cc.questForm.saving : cc.questForm.saveQuest}
							</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
