import LegalLayout, { H2, UL } from './LegalLayout';

// Draft — describes what the app actually does today. Have it reviewed before
// relying on it, and keep it in step with the code when data handling changes.
export default function PrivacyPage() {
	return (
		<LegalLayout title="Privacy policy" updated="25 October 2026">
			<p>
				Grand City Race is a scavenger hunt you play with friends. This policy
				explains what the app collects, why, and how to get rid of it.
			</p>

			<H2>What we collect</H2>
			<UL>
				<li>
					<strong>Your account:</strong> the name and email address you sign up
					with. Passwords are handled by Google Firebase Authentication and are
					never visible to us.
				</li>
				<li>
					<strong>Your location:</strong> while a race you take part in is
					running, from its start until it ends or your team finishes,
					including when the app is in the background if you allow it. We keep
					your most recent position and a trail of earlier positions during the
					game.
				</li>
				<li>
					<strong>Gameplay:</strong> the team you belong to, quests you solve,
					answers you submit, hints you buy, items you buy, and your team's coin
					balance.
				</li>
				<li>
					<strong>Messages:</strong> what you write to the people hosting your
					game.
				</li>
				<li>
					<strong>Notifications:</strong> a push token, if you allow
					notifications, so announcements can reach you.
				</li>
			</UL>

			<H2>Why we collect it</H2>
			<p>
				Location is what makes the game work: quests unlock when your team
				reaches a place or has travelled far enough, and the people hosting your
				game can see where teams are so they can help you when something goes
				wrong. Everything else exists to run the race and to let you talk to
				your hosts.
			</p>
			<p>
				We do not use your data for advertising, we do not sell it, and there
				are no third-party trackers or analytics in the app.
			</p>

			<H2>Who can see what</H2>
			<UL>
				<li>
					<strong>The people hosting your game</strong> can see your name, your
					team, your position while a game is running, your messages to them,
					and your team's progress.
				</li>
				<li>
					<strong>Your teammates</strong> can see your most recent position
					during the race, so the app can tell when the team is too spread out.
				</li>
				<li>
					<strong>Other teams</strong> can see your team's name and public
					progress. During the race they cannot see your position, your
					messages, your team's coins, or what your team buys in the shop.
				</li>
				<li>
					<strong>After the race</strong>, the people hosting it may share a
					recap with everyone who played. It shows each team's route, merged
					from its members' positions and smoothed so it is approximate and
					never shows one person's own, along with what each team bought and
					how it did. It never shows your messages.
				</li>
				<li>
					<strong>We</strong> (the platform operator) can access data in order
					to run and support the service.
				</li>
			</UL>

			<H2>Who processes it for us</H2>
			<UL>
				<li>
					<strong>Google Firebase</strong> — sign-in, database and the server
					that runs the game. The database and the server are in the EU; sign-in
					data may be processed outside it.
				</li>
				<li>
					<strong>Expo</strong> — delivery of push notifications.
				</li>
				<li>
					<strong>Sentry</strong> — reports of crashes and errors in the app and the
					web console, in the EU. They say what broke and on which device or
					browser, never your name, email or position.
				</li>
				<li>
					<strong>YouTube and image hosts</strong> — videos and pictures a host adds
					to a quest are loaded from where they are published, which sees your
					device's IP address. YouTube videos play in its privacy-enhanced mode.
				</li>
				<li>
					<strong>Netlify</strong> — hosting of the web console you are reading
					this on.
				</li>
				<li>
					<strong>Esri</strong> — the street maps in the console and in the
					recap are loaded from Esri's map service, which sees your device's IP
					address.
				</li>
			</UL>

			<H2>How long we keep it</H2>
			<p>
				Your account data stays until you delete your account. Location trails
				are deleted seven days after the race ends; from then on only the
				recap's approximate team routes remain. Deleting your account removes your
				profile, your location history and the messages you sent. Your team's
				progress, and its route in a recap, stay, because they belong to the
				team and other players are still using them; they no longer identify
				you once your account is gone.
			</p>

			<H2>Deleting your account</H2>
			<p>
				In the app, open your profile and choose <strong>Delete account</strong>
				. It is immediate and cannot be undone. Without the app, see{' '}
				<a className="underline" href="/support#delete-account">
					Deleting your account
				</a>{' '}
				on the support page.
			</p>

			<H2>Children</H2>
			<p>
				The app is not intended for children under 13, and we do not knowingly
				collect their data.
			</p>

			<H2>Contact</H2>
			<p>
				Questions, or a request about your data:{' '}
				<a className="underline" href="mailto:paddock-cliques5u@icloud.com">
					paddock-cliques5u@icloud.com
				</a>
				.
			</p>
		</LegalLayout>
	);
}
