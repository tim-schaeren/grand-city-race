import { rich } from '../utils/rich';
import { consoleCopy as cc } from '@grandcityrace/shared';
import { useState, useEffect } from 'react';
import {
	DEFAULT_ECONOMY,
	DEFAULT_THEME_ID,
	THEME_LIST,
	gameEconomy,
	themeFor,
} from '@grandcityrace/shared';
import { geocodeCity } from '../utils/geocode';
import { displayFont } from '../utils/themeStyle';
import { TIME_ZONES, browserTimeZone, gameTimeZone, toZonedInput, fromZonedInput } from '../utils/zonedTime';

const EMPTY = {
	name: '',
	startDateTime: '',
	timeZone: browserTimeZone(),
	city: '',
	maxTeamSize: '',
	maxTeamSpreadMeters: '',
	hotlineNumber: '',
	startingCoins: String(DEFAULT_ECONOMY.startingCoins),
	coinsPerQuest: String(DEFAULT_ECONOMY.coinsPerQuest),
	hintCost: String(DEFAULT_ECONOMY.hintCost),
	themeId: DEFAULT_THEME_ID,
};

// The start is shown and typed by the game's own clock, and saved by it
function toFormState(game) {
	if (!game) return { ...EMPTY, timeZone: browserTimeZone() };
	const timeZone = gameTimeZone(game);
	const dt = game.startDateTime ? toZonedInput(game.startDateTime, timeZone) : '';
	const economy = gameEconomy(game);
	return {
		name: game.name,
		startDateTime: dt,
		timeZone,
		city: game.city,
		maxTeamSize: game.maxTeamSize ?? '',
		maxTeamSpreadMeters: game.maxTeamSpreadMeters ?? '',
		hotlineNumber: game.hotlineNumber ?? '',
		startingCoins: String(economy.startingCoins),
		coinsPerQuest: String(economy.coinsPerQuest),
		hintCost: String(economy.hintCost),
		themeId: themeFor(game.themeId).id,
	};
}

// A small drawing of a quest screen in the theme's own colours and type
function ThemeOption({ theme, selected, onSelect }) {
	const c = theme.colors;
	const edge = theme.shape.shadowOffset;
	const display = displayFont(theme);
	return (
		<button
			type="button"
			onClick={onSelect}
			className={`text-left rounded-lg border-2 p-1.5 transition-colors ${selected ? 'border-gray-900' : 'border-gray-200 hover:border-gray-300'}`}
		>
			<div
				className="rounded-md px-3 py-4 flex flex-col items-center gap-2"
				style={{ background: c.background, border: `1px solid ${edge ? c.border : '#e5e7eb'}` }}
			>
				<span
					className="text-[9px] tracking-[0.2em] uppercase"
					style={{ color: theme.uppercaseHeadings ? c.text : c.muted, fontFamily: display }}
				>
					{cc.gameForm.quest3Of8}
				</span>
				<span
					className="leading-tight text-center"
					style={{
						color: c.heading,
						fontFamily: display,
						fontWeight: display ? 400 : 700,
						fontSize: `${18 * theme.fonts.scale}px`,
						textTransform: theme.uppercaseHeadings ? 'uppercase' : 'none',
						textShadow: theme.headingShadow ? `2px 2px 0 ${c.shadow}` : 'none',
					}}
				>
					{cc.gameForm.theOldFountain}
				</span>
				<span
					className="text-[11px] px-3 py-1 mt-1"
					style={{
						background: c.accent,
						color: c.onAccent,
						fontFamily: display,
						borderRadius: theme.shape.radius / 2,
						boxShadow: edge ? `${edge / 2}px ${edge / 2}px 0 ${c.shadow}` : 'none',
						textTransform: theme.uppercaseHeadings ? 'uppercase' : 'none',
					}}
				>
					{cc.gameForm.continue}
				</span>
			</div>
			<div className="px-1 pt-2 pb-1">
				<p className="text-sm font-medium text-gray-900">{theme.name}</p>
				<p className="text-xs text-gray-400">{theme.description}</p>
			</div>
		</button>
	);
}

export default function GameForm({ game, onSave, onCancel, onDelete, saving }) {
	const [form, setForm] = useState(() => toFormState(game));
	const [errors, setErrors] = useState({});
	const [geocoding, setGeocoding] = useState(false);
	const [confirming, setConfirming] = useState(false);
	const [deleteInput, setDeleteInput] = useState('');

	useEffect(() => {
		setForm(toFormState(game));
		setErrors({});
		setConfirming(false);
		setDeleteInput('');
	}, [game?.id]);

	function set(field, value) {
		setForm((f) => ({ ...f, [field]: value }));
	}

	function validate() {
		const e = {};
		if (!form.name.trim()) e.name = cc.gameForm.nameIsRequired;
		if (!form.startDateTime)
			e.startDateTime = cc.gameForm.startDateAndTimeAre;
		if (!form.city.trim()) e.city = cc.gameForm.cityIsRequired;
		for (const [field, label] of [
			['startingCoins', cc.gameForm.startingCoins],
			['coinsPerQuest', cc.gameForm.coinsPerQuest],
			['hintCost', cc.gameForm.hintCost],
		]) {
			const value = parseInt(form[field]);
			if (!Number.isFinite(value) || value < 0)
				e[field] = cc.gameForm.mustBe0OrMore({ label: label });
		}
		setErrors(e);
		return Object.keys(e).length === 0;
	}

	async function handleSave() {
		if (!validate()) return;
		setGeocoding(true);
		try {
			const coords = await geocodeCity(form.city.trim());
			if (!coords) {
				setErrors((e) => ({
					...e,
					city: cc.gameForm.couldNotFindThisCity,
				}));
				return;
			}
			const parsedSize = parseInt(form.maxTeamSize);
			const parsedSpread = parseInt(form.maxTeamSpreadMeters);
			onSave({
				name: form.name.trim(),
				startDateTime: fromZonedInput(form.startDateTime, form.timeZone),
				timeZone: form.timeZone,
				city: form.city.trim(),
				cityCoordinates: coords,
				questOrder: game?.questOrder ?? [],
				maxTeamSize:
					Number.isFinite(parsedSize) && parsedSize > 0 ? parsedSize : null,
				maxTeamSpreadMeters:
					Number.isFinite(parsedSpread) && parsedSpread > 0
						? parsedSpread
						: null,
				hotlineNumber: form.hotlineNumber.trim(),
				startingCoins: parseInt(form.startingCoins),
				coinsPerQuest: parseInt(form.coinsPerQuest),
				hintCost: parseInt(form.hintCost),
				themeId: form.themeId,
			});
		} finally {
			setGeocoding(false);
		}
	}

	const isBusy = saving || geocoding;
	const deleteConfirmed = deleteInput === game?.name;

	return (
		<div className="flex flex-col h-full">
			<div className="px-6 py-4 border-b border-gray-200">
				<h2 className="text-base font-semibold text-gray-900">
					{game ? cc.gameForm.editGame : cc.gameForm.newGame}
				</h2>
			</div>

			<div className="flex-1 overflow-y-auto px-6 py-5">
				{confirming ? (
					<div className="space-y-4">
						<div className="bg-red-50 border border-red-200 rounded-lg p-4">
							<p className="text-sm font-semibold text-red-700 mb-1">
								{cc.gameForm.deleteThisGame}
							</p>
							<p className="text-sm text-red-600">
								{rich(cc.gameForm.thisWillPermanentlyDeleteAnd({ span: <span className="font-medium">{game.name}</span> }))}
							</p>
						</div>
						<div>
							<label className="block text-sm text-gray-700 mb-1">
								{rich(cc.gameForm.typeToConfirm({ span: <span className="font-semibold">{game.name}</span> }))}
							</label>
							<input
								className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
								value={deleteInput}
								onChange={(e) => setDeleteInput(e.target.value)}
								placeholder={game.name}
								autoFocus
							/>
						</div>
					</div>
				) : (
					<div className="space-y-5">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								{cc.gameForm.name}
							</label>
							<input
								className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
								value={form.name}
								onChange={(e) => set('name', e.target.value)}
								placeholder={cc.gameForm.eGGrandCityRace}
							/>
							{errors.name && (
								<p className="text-xs text-red-500 mt-1">{errors.name}</p>
							)}
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								{cc.gameForm.startDateTime}
							</label>
							<input
								type="datetime-local"
								className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${errors.startDateTime ? 'border-red-400' : 'border-gray-300'}`}
								value={form.startDateTime}
								onChange={(e) => set('startDateTime', e.target.value)}
							/>
							{errors.startDateTime && (
								<p className="text-xs text-red-500 mt-1">
									{errors.startDateTime}
								</p>
							)}
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								{cc.gameForm.timeZone}
							</label>
							<select
								className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
								value={form.timeZone}
								onChange={(e) => set('timeZone', e.target.value)}
							>
								{(TIME_ZONES.includes(form.timeZone) ? TIME_ZONES : [form.timeZone, ...TIME_ZONES]).map((zone) => (
									<option key={zone} value={zone}>{zone.replace(/_/g, ' ')}</option>
								))}
							</select>
							<p className="text-xs text-gray-400 mt-1">{cc.gameForm.timeZoneHelp}</p>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								{cc.gameForm.city}
							</label>
							<input
								className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${errors.city ? 'border-red-400' : 'border-gray-300'}`}
								value={form.city}
								onChange={(e) => set('city', e.target.value)}
								placeholder={cc.gameForm.eGZurich}
							/>
							{errors.city && (
								<p className="text-xs text-red-500 mt-1">{errors.city}</p>
							)}
							<p className="text-xs text-gray-400 mt-1">
								{cc.gameForm.usedAsTheDefaultMap}
							</p>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								{cc.gameForm.maxTeamSize}
							</label>
							<input
								type="number"
								min="1"
								className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
								value={form.maxTeamSize}
								onChange={(e) => set('maxTeamSize', e.target.value)}
								placeholder={cc.gameForm.noLimit}
							/>
							<p className="text-xs text-gray-400 mt-1">
								{cc.gameForm.leaveBlankForNoLimit}
							</p>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								{cc.gameForm.maxTeamSpreadMeters}
							</label>
							<input
								type="number"
								min="1"
								className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
								value={form.maxTeamSpreadMeters}
								onChange={(e) => set('maxTeamSpreadMeters', e.target.value)}
								placeholder={cc.gameForm.noLimit}
							/>
							<p className="text-xs text-gray-400 mt-1">
								{cc.gameForm.maxDistanceBetweenTeamMembers}
							</p>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								{cc.gameForm.hotlineNumber}
							</label>
							<input
								type="tel"
								className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
								value={form.hotlineNumber}
								onChange={(e) => set('hotlineNumber', e.target.value)}
								placeholder="+41 79 123 45 67"
							/>
							<p className="text-xs text-gray-400 mt-1">
								{cc.gameForm.shownToPlayersAsCall}
							</p>
						</div>

						<div className="border-t border-gray-200 pt-5">
							<h3 className="text-sm font-semibold text-gray-900 mb-1">
								{cc.gameForm.look}
							</h3>
							<p className="text-xs text-gray-400 mb-3">
								{cc.gameForm.howTheGameLooksOn}
							</p>
							<div className="grid grid-cols-2 gap-3">
								{THEME_LIST.map((theme) => (
									<ThemeOption
										key={theme.id}
										theme={theme}
										selected={form.themeId === theme.id}
										onSelect={() => set('themeId', theme.id)}
									/>
								))}
							</div>
						</div>

						<div className="border-t border-gray-200 pt-5">
							<h3 className="text-sm font-semibold text-gray-900 mb-1">
								{cc.gameForm.coins}
							</h3>
							<p className="text-xs text-gray-400 mb-3">
								{cc.gameForm.teamsSpendCoinsToReveal}
							</p>
							<div className="grid grid-cols-3 gap-3">
								{[
									[cc.gameForm.startingCoins2, cc.gameForm.starting],
									[cc.gameForm.coinsPerQuest2, cc.gameForm.perQuest],
									[cc.gameForm.hintCost2, cc.gameForm.perHint],
								].map(([field, label]) => (
									<div key={field}>
										<label className="block text-xs font-medium text-gray-700 mb-1">
											{label}
										</label>
										<input
											type="number"
											min="0"
											className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${errors[field] ? 'border-red-400' : 'border-gray-300'}`}
											value={form[field]}
											onChange={(e) => set(field, e.target.value)}
										/>
									</div>
								))}
							</div>
							{[cc.gameForm.startingCoins2, cc.gameForm.coinsPerQuest2, cc.gameForm.hintCost2].map(
								(f) =>
									errors[f] && (
										<p key={f} className="text-xs text-red-500 mt-1">
											{errors[f]}
										</p>
									),
							)}
						</div>
					</div>
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
							{cc.gameForm.back}
						</button>
						<button
							onClick={onDelete}
							disabled={!deleteConfirmed}
							className="ml-auto px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
						>
							{cc.gameForm.deleteGame}
						</button>
					</>
				) : (
					<>
						{game && (
							<button
								onClick={() => setConfirming(true)}
								className="text-sm text-red-400 hover:text-red-600 transition-colors"
							>
								{cc.gameForm.delete}
							</button>
						)}
						<div className="ml-auto flex gap-2">
							<button
								onClick={onCancel}
								className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
							>
								{cc.gameForm.cancel}
							</button>
							<button
								onClick={handleSave}
								disabled={isBusy}
								className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
							>
								{isBusy ? cc.gameForm.saving : cc.gameForm.saveGame}
							</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
