import { SHOP_ITEMS, THEME_LIST } from '@grandcityrace/shared';
import LegalLayout, { H2, UL } from '../legal/LegalLayout';

// The host manual, linked from the console. Keep it in step with the console
// and the app: any change to hosting belongs here in the same commit.
export default function HostHelpPage() {
  return (
    <LegalLayout title="Hosting a race" updated="26 October 2026">
      <p>
        Hosting happens here on the website; you don't need the app. You set up the game
        and its quests, share an invite code, and follow the race live. Players need the
        app — see <a className="underline" href="/help">How to play</a> for what they see.
      </p>
      <p>
        Each game has three parts, along the top: <strong>Prepare</strong> (overview, quests,
        shop, teams, test run and settings), <strong>Race</strong> (control, map, feed and chat)
        and <strong>After</strong> (results and recap). The menu beside the logo switches between
        your games; the <strong>Account</strong> menu sets the console to light, dark or like your
        system.
      </p>
      <p>
        Every team, player, quest and shop item has a page of its own, and wherever one is
        named (in the feed, the standings, the map, the chat) it links there. A team's page
        has its progress, players, coins, items, chat, wrong answers and feed, with the fixes
        for coins and progress. A quest's page is where you write it, with a phone beside it showing what players see; on race day it shows who's on it, who
        solved it and the wrong answers typed. An item's page shows who has it running and
        every time it was bought or used. A player's page moves them to another team or out
        of the game.
      </p>

      <p>
        Anything that can't be undone or touches everyone (starting or ending the race,
        resetting or deleting the game, deleting a quest or team, removing a player) asks
        first, and asks you to type its name, so it never happens by a slip of the mouse.
      </p>

      <H2 id="setup">1. Set up the game</H2>
      <UL>
        <li>Sign up, then <strong>Create your first game</strong>. It takes three things: a
          name, a start (date and time, with the time zone they're in, usually the race's city)
          and a city, which centres the maps when you place quests. Type the city, press{' '}
          <strong>Find</strong> and pick the right one, so a Bern in Kansas doesn't end up as your
          Bern. The overview then shows the next step to take; the race won't start before its time
          unless you start it. Everything else starts
          with sensible settings.</li>
        <li><strong>Prepare › Settings</strong> has the rest, and saves when you press{' '}
          <strong>Save</strong>:
          <UL>
            <li><strong>Most players in a team</strong> and <strong>most distance between
              teammates</strong> are optional. With a distance set, a team can only answer while
              its members are that close together.</li>
            <li>A <strong>hotline number</strong> lets players call you from the chat.</li>
            <li><strong>Look:</strong> the theme players see. {THEME_LIST.map(t => t.name).join(', ')}.
              The phone beside each quest wears it.</li>
            <li><strong>Coins:</strong> what teams start with, earn per solved quest, and pay per
              hint.</li>
            <li>At the bottom you can delete the game, with everything in it.</li>
          </UL>
        </li>
        <li><strong>Prepare › Overview</strong> has a checklist of what's still to do, each
          step linked to where it's done. <strong>Guide me through it</strong> takes you to
          each step's page in turn, with a bar saying why it matters. Once a step is done,{' '}
          <strong>Next</strong> takes you on; <strong>Skip for now</strong> moves past one, and you can
          leave the guide whenever you like.</li>
        <li>The <strong>game checker</strong>, also on the overview, lists what would go wrong
          in the race as it's set up: a quest missing its place, text or answers (problems), a
          fence under 20 m or a hint teams can't afford yet (warnings), and a quest that unlocks
          right where the one before ends because their fences overlap (notes). Each links to where it's fixed, and a quest's own
          findings show at the top of its page as you edit.</li>
      </UL>

      <H2 id="quests">2. Create quests</H2>
      <p>
        <strong>Prepare › Quests</strong> shows every quest in the order teams play them, each
        with what teams read on the way there and when they arrive, so you see where one
        quest hands over to the next. Drag a quest to move it; open it to edit it.
      </p>
      <p>
        A quest's page follows how teams live it. On top is how the quest before ends. Then:
      </p>
      <UL>
        <li><strong>1 · On the way here</strong>: how it unlocks, and the{' '}
          <strong>navigation hint</strong> teams see as soon as they finish the quest before.
          It only tells them how to find the place; what they do there belongs in step 2.
          <UL>
            <li><strong>At a place:</strong> unlocks when a team member is inside the fence
              around the place. Click the map to set it. GPS can be off by 10–30 m, more between
              tall buildings, so 25–40 m suits most places.</li>
            <li><strong>After a distance:</strong> unlocks after the team has walked a set
              distance, counted from every member's phone. You can hide the progress to keep it a
              surprise.</li>
            <li><strong>Right away:</strong> nothing to find; teams go straight to step 2.</li>
          </UL>
        </li>
        <li><strong>2 · When they arrive</strong>: the title, what they read, and then:
          <UL>
            <li><strong>Answer a question:</strong> list every spelling you'll accept; capitals
              and surrounding spaces are ignored. Add hints; teams buy them one at a time. While
              the race runs, wrong answers teams typed appear here, and <strong>Accept</strong>{' '}
              adds one to the accepted answers. Each hint shows how many teams bought it.</li>
            <li><strong>Wait:</strong> a countdown, such as a break, that starts when the quest
              unlocks. Pausing the race pauses it too.</li>
            <li><strong>Read and continue:</strong> information only; teams tap Continue.</li>
          </UL>
        </li>
      </UL>
      <p>
        Beside the form a phone shows the quest exactly as players will see it, in the race's
        theme: on the way, with a compass or radar, arrived, with a hint bought, and after a
        wrong answer. It changes as you type. Nothing reaches players until you{' '}
        <strong>Save</strong>; during the race, teams on the quest see saved changes at once, and
        the page says how many are on it. A quest's <strong>Race day</strong> tab shows who's on
        it, who solved it, the wrong answers typed and its place on a map.
      </p>
      <p>
        Texts and hints can hold text, pictures and YouTube videos. For a picture, press{' '}
        <strong>Upload a picture</strong> and pick it from your computer; it's made smaller for
        phones and kept with the game until the game is deleted. A picture that's already
        online can be used by its address instead: right-click it in your browser, choose{' '}
        <strong>Copy image address</strong> and paste that.{' '}
        <strong>Export</strong> and <strong>Import</strong> copy quests between games. Switching{' '}
        <strong>Active</strong> off, at the top of a quest, makes the race skip it without
        deleting it.
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
        Under <strong>Prepare › Shop</strong>, turn each item on or off and set its price and settings
        for this game. New items start switched off. Curse, Robbery and Donate are used on
        another team: everyone sees them in the activity feed, and the team on the
        receiving end gets a notification.
      </p>
      <p>
        During the race, a new price applies from the next purchase and the feed tells
        everyone. A <strong>flash sale</strong>, at the top of the shop, takes 25 to 100% off the
        items you tick for 5 to 30 minutes: it's announced in the feed and with a push
        notification, players see the old prices struck through, and prices go back by
        themselves when the time is up. <strong>End it now</strong> stops it early.
      </p>
      <UL>
        {SHOP_ITEMS.map(item => (
          <li key={item.type}><strong>{item.name}:</strong> {item.description}</li>
        ))}
      </UL>

      <H2 id="test">4. Test it all</H2>
      <p>
        Before the race, <strong>Prepare › Test run</strong> lets you play it on your phone the
        way a team will. <strong>Start a test run</strong>, then scan the QR code with your
        phone's camera: the app opens on a hidden test team, with whatever account is signed
        in there (one that isn't already playing in this game). The test team can play
        straight away, before the start.
      </p>
      <UL>
        <li>From the console, <strong>Arrive at the place</strong> unlocks the quest as if the
          phone were there, <strong>Put the team here</strong> jumps to any quest,{' '}
          <strong>Give 50 coins</strong> tops it up, <strong>Send a curse</strong> and{' '}
          <strong>Send a robbery</strong> try those on it, and <strong>Start over</strong> sends it back
          to quest 1.</li>
        <li>In the app, the test team can use items on a hidden <strong>test rival</strong> only.
          Real teams are never touched.</li>
        <li>Nobody else sees the test teams: not in the app, the standings, the feed or the
          recap. <strong>End the test run</strong> takes everyone off them, and starting the race
          does so too. <strong>New link</strong> stops an old link from working.</li>
      </UL>

      <H2 id="teams">5. Invite players</H2>
      <UL>
        <li>Share the <strong>invite code</strong> from <strong>Prepare › Overview</strong>. If it leaks, make a new
          one; players who already joined stay in.</li>
        <li>Players pick or start their own teams. Under <strong>Prepare › Teams</strong> you can also
          create teams, rename them and pick their colours, and move players between them by
          dragging (drop someone under <strong>Without a team</strong>, or press ×, to take them
          off). A team's coins (with a reason teams can see) and its progress are fixed on
          the team's own page.</li>
        <li>To add someone without the code, enter their email on <strong>Teams</strong>;
          they need an account first.</li>
        <li>Add co-hosts under <strong>Hosts</strong> on the overview, by the email they
          signed up with; they need an account first. Any host can add or remove
          co-hosts, and a game always keeps at least one.</li>
      </UL>

      <H2 id="running">6. Run the race</H2>
      <UL>
        <li>The race starts at its start time, or press <strong>Start now</strong> under{' '}
          <strong>Starting the race</strong> on the overview, which works once the game checker
          finds no problems and shows its warnings and notes first. A race that still has
          problems at its start time doesn't start: players keep waiting, every console page
          says so, and hosts signed in to the app get a notification. Fix the problems, then
          press <strong>Start now</strong>. Once it runs, a bar above every <strong>Race</strong> page shows how long
          it has been going. <strong>Pause</strong> freezes everything, timers included;{' '}
          <strong>Resume</strong> carries on. <strong>End race</strong> stops it for everyone.</li>
        <li><strong>Control</strong> is the race on one screen. On a laptop: what needs
          attention (messages waiting, teams stuck after three wrong answers on a quest,
          teams with no position for five minutes) and the standings on the left, the map in
          the middle, and the chat and the latest feed on the right. A team, quest, item or
          player opened from there slides in from the side; close it, or press Escape, to get
          back. On a phone, Control shows what needs attention and the standings; the map, feed
          and chat are the tabs next to it.</li>
        <li><strong>Map:</strong> where every team is, with its trail of the last 30
          minutes (or the whole race), on a street map or satellite pictures. The team list
          (beside the map, or at the bottom on a phone) shows each team's quest, whether it's
          at the spot, and when its last position came in; a team turns grey when nobody in it
          has sent one for five minutes. Tap a team to fly to it, pick out its trail and list its
          players with when each last sent a position; tap a player to go to them.{' '}
          <strong>Follow</strong> keeps the team in view as it moves. Players appear on their own
          when you zoom in, and markers that would cover each other are stacked apart.</li>
        <li><strong>Chat:</strong> one thread per team. Teams get a push notification when you
          reply. Unread messages show as a number on <strong>Race</strong> and{' '}
          <strong>Chat</strong>.</li>
        <li><strong>Changing things mid-race:</strong> a quest edited while the race runs
          reaches the teams on it as soon as you save, with a note in the app that the hosts
          updated it at that time; teams past it aren't affected. Every such edit is kept in the
          feed for hosts only (players don't see it), along with the quest's own feed.</li>
        <li><strong>Deleting a quest mid-race:</strong> teams on it move on to the next quest;
          if it was the last, they finish.</li>
        <li><strong>Feed:</strong> everything that happened, for all teams or one. Post a note
          to all teams, optionally as a push notification.</li>
      </UL>

      <H2 id="results">After the race: results</H2>
      <p>
        <strong>After › Results</strong> has the final standings: each team's place, time or
        quests solved, and coins. To put a team's result right, open its page and fix its
        progress or coins there; then build the recap again so it shows too.
      </p>

      <H2 id="recap">The recap</H2>
      <p>
        Once a game has ended, <strong>After › Recap</strong> tells the
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
        <li>Players' location trails are deleted a week after the race ends; the recap keeps
          its own routes, and is built then if you haven't. A race nobody ends counts as over
          30 days after its start, and the console tells you a week before.</li>
      </UL>

      <H2 id="reset">Starting over</H2>
      <p>
        Once a game has ended, <strong>Reset the game</strong> under <strong>After › Results</strong> sends every team back to the start
        and clears everything the race left behind: progress, coins, activity, chat, wrong
        answers, positions and trails on the map, and the recap. Build the recap first if you
        want one. Teams and players stay, ready for another round, and the race waits for the
        new start you give it.
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
