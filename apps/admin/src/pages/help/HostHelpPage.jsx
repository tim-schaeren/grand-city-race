import { SHOP_ITEMS, THEME_LIST } from '@grandcityrace/shared';
import LegalLayout, { H2, UL } from '../legal/LegalLayout';

// The host manual, linked from the console. Keep it in step with the console
// and the app: any change to hosting belongs here in the same commit.
export default function HostHelpPage() {
  return (
    <LegalLayout title="Hosting a race" updated="22 October 2026">
      <p>
        Hosting happens here on the website; you don't need the app. You set up the game
        and its quests, share an invite code, and follow the race live. Players need the
        app — see <a className="underline" href="/help">How to play</a> for what they see.
      </p>

      <H2 id="setup">1. Create the game</H2>
      <UL>
        <li>Sign up, then <strong>Create your first game</strong>. Give it a name, a start
          date and time with the time zone they're in (usually the race's city; it starts as
          your own), and a city; the city centres the map when you place quests.</li>
        <li><strong>Max team size</strong> and <strong>Max team spread</strong> are optional.
          With a spread set, a team can only submit answers while its members are within
          that distance of each other.</li>
        <li>A <strong>hotline number</strong> lets players call you from the chat.</li>
        <li><strong>Coins:</strong> what teams start with, earn per solved quest, and pay per
          hint.</li>
        <li><strong>Look:</strong> the theme players see. {THEME_LIST.map(t => t.name).join(', ')}.</li>
      </UL>

      <H2 id="quests">2. Write the quests</H2>
      <p>
        On <strong>Quests</strong>, add quests and drag them into order. Teams play them in
        that order. Every quest has a <strong>trigger</strong> (what unlocks it) and a{' '}
        <strong>task</strong> (what the team does then).
      </p>
      <p className="font-medium text-gray-900">Triggers</p>
      <UL>
        <li><strong>Location:</strong> unlocks when a team member is inside the fence around a
          place. Set the place on the map and a fence radius (50 m is a good start; GPS in
          old towns can be off by 20 m). The <strong>navigation hint</strong> tells teams where
          to go.</li>
        <li><strong>Distance:</strong> unlocks after the team has walked a set distance,
          counted from every member's phone. You can hide the progress bar to keep it a
          surprise.</li>
        <li><strong>None:</strong> unlocked right away.</li>
      </UL>
      <p className="font-medium text-gray-900">Tasks</p>
      <UL>
        <li><strong>Answer:</strong> teams type an answer. List every spelling you'll accept;
          capitals and surrounding spaces are ignored. Add hints; teams buy them one at a
          time. While the race runs, the wrong answers teams typed appear when you edit the
          quest, and <strong>Accept</strong> adds one to the valid answers.</li>
        <li><strong>Timer:</strong> a countdown, such as a break, that starts when the quest
          unlocks. Pausing the game pauses it too.</li>
        <li><strong>Continue:</strong> information only; teams tap Continue.</li>
      </UL>
      <p>
        Descriptions, hints and navigation hints can hold text, pictures (by link) and
        YouTube videos. <strong>Export</strong> and <strong>Import</strong> copy quests between
        games.
      </p>
      <p className="font-medium text-gray-900">Writing good quests</p>
      <UL>
        <li>Only send teams to places that are public, safe and legal to reach.</li>
        <li>Test every location on the spot; a fence that's too small can't be unlocked.</li>
        <li>Answers should have one obvious right form, or list the variants.</li>
        <li>The activity feed shows other teams only quest numbers, never titles, so a
          title doesn't give the next place away there.</li>
      </UL>

      <H2 id="shop">3. Set up the shop</H2>
      <p>
        On <strong>Items</strong>, turn each item on or off and set its price and settings
        for this game. New items start switched off. Curse, Robbery and Donate are used on
        another team: everyone sees them in the activity feed, and the team on the
        receiving end gets a notification.
      </p>
      <UL>
        {SHOP_ITEMS.map(item => (
          <li key={item.type}><strong>{item.name}:</strong> {item.description}</li>
        ))}
      </UL>

      <H2 id="teams">4. Invite players</H2>
      <UL>
        <li>Share the <strong>invite code</strong> from the Game page. If it leaks, make a new
          one; players who already joined stay in.</li>
        <li>Players pick or start their own teams. On <strong>Teams</strong> you can also
          create teams, move players between them by dragging, adjust a team's coins (with
          a reason teams can see), and correct a team's progress.</li>
        <li>Add co-hosts under <strong>Hosts</strong> on the Game page, by the email they
          signed up with; they need an account first. Any host can add or remove
          co-hosts, and a game always keeps at least one.</li>
      </UL>

      <H2 id="running">5. Run the race</H2>
      <UL>
        <li>The race starts at its start time, or press <strong>Start now</strong>.
          <strong> Pause</strong> freezes everything, timers included; <strong>Resume</strong>
          carries on. <strong>End game</strong> stops it for everyone.</li>
        <li><strong>Live map:</strong> where every team is, with its trail of the last 30
          minutes (or the whole race), on a street map or satellite pictures. The team list
          (beside the map, or at the bottom on a phone) shows each team's quest, whether it's
          at the spot, and when its last position came in; a team turns grey when nobody in it
          has sent one for five minutes. Tap a team to fly to it, pick out its trail and list its
          players with when each last sent a position; tap a player to go to them.{' '}
          <strong>Follow</strong> keeps the team in view as it moves. Players appear on their own
          when you zoom in, and markers that would cover each other are stacked apart.</li>
        <li><strong>Leaderboard:</strong> standings, what each team is doing, and a warning
          for teams stuck on a quest after several wrong answers.</li>
        <li><strong>Chat:</strong> one thread per team. Teams get a push notification when you
          reply.</li>
        <li><strong>Activity:</strong> everything that happened. Post a note to all teams,
          optionally as a push notification.</li>
      </UL>

      <H2 id="recap">After the race: the recap</H2>
      <p>
        Once a game has ended, the <strong>Recap</strong> panel on the Game page tells the
        story of the race: a replay of every team's route with its curses, robberies,
        shields, gifts and finishes, places over time, awards, a card for each team with
        what it bought, and the final standings.
      </p>
      <UL>
        <li><strong>Build recap</strong> puts it together from the race. Only hosts can see it
          at first; <strong>Open recap</strong> shows it full screen, for a look or for a big
          screen at the after-party, where the arrow keys step through it.</li>
        <li><strong>Show to players</strong> when you're ready. Players get a notification the
          first time, and a <strong>See the recap</strong> button in the app. <strong>Hide from
          players</strong> takes it back.</li>
        <li>After a correction (coins, a quest marked solved), <strong>Build again</strong>.
          The recap always wears the game's current theme.</li>
        <li>Routes are per team, merged from its members and smoothed, never one player's
          own. The recap also reveals what each team bought, which the activity feed kept to
          the team during the race.</li>
      </UL>

      <H2 id="reset">Starting over</H2>
      <p>
        Once a game has ended, <strong>Reset game</strong> sends every team back to the start
        and clears everything the race left behind: progress, coins, activity, chat, wrong
        answers, positions and trails on the map, and the recap. Build the recap first if you
        want one. Teams and players stay, ready for another round.
      </p>

      <H2 id="privacy">What you can see</H2>
      <p>
        As a host you see your players' names, their teams, their positions during the
        race, their messages to you, and their progress. Not their email addresses. Players
        see other teams' routes only in a recap you've shown them. Please
        treat it with care; see the{' '}
        <a className="underline" href="/guidelines">community guidelines</a>.
      </p>
    </LegalLayout>
  );
}
