import { SHOP_ITEMS } from '@grandcityrace/shared';
import LegalLayout, { H2, UL } from '../legal/LegalLayout';
import Icon from '../../components/Icon';

// The player manual, linked from the app. Keep it in step with the app: any
// change to what players see or do belongs here in the same commit.
export default function PlayerHelpPage() {
  return (
    <LegalLayout title="How to play" updated="21 October 2026">
      <p>
        Grand City Race is a scavenger hunt through your city, played in teams. Your
        hosts set the quests; your team races to solve them before the others.
      </p>

      <H2 id="joining">Joining a race</H2>
      <UL>
        <li>Create an account in the app, then enter the <strong>invite code</strong> your
          hosts gave you.</li>
        <li>Pick a team to see who is in it, then join. Or start your own team: give it a
          name and tap the coloured circle to choose its colour.</li>
        <li>Before the race starts, the app counts down to the start.</li>
      </UL>

      <H2 id="permissions">Location and notifications</H2>
      <p>
        Before the first quest the app explains both permissions, then asks for them.
      </p>
      <UL>
        <li><strong>Location</strong> unlocks quests and lets your hosts see where your team
          is. Allow it <strong>all the time</strong> (Android) or <strong>Always</strong> (iPhone),
          or your team's progress stops whenever your screen goes dark. It's only used while
          your race is running, from the start until you finish, and only your hosts see it then. After the race, the
          recap shows each team's route, smoothed and approximate, never one person's.</li>
        <li><strong>Notifications</strong> bring announcements from your hosts and replies to
          your messages.</li>
      </UL>

      <H2 id="quests">Quests</H2>
      <p>Quests come one after another. Each one first has to be unlocked:</p>
      <UL>
        <li><strong>At a place:</strong> a hint tells you where to go. The quest opens when
          your team gets there.</li>
        <li><strong>After a distance:</strong> keep walking. A bar may show how far your team
          has come; every member's steps count.</li>
        <li><strong>Straight away:</strong> some quests are open as soon as you reach them.</li>
      </UL>
      <p>Once open, a quest asks for one of three things:</p>
      <UL>
        <li><strong>An answer:</strong> type it in and tap the arrow. Capitals don't matter.
          A wrong answer simply lets you try again.</li>
        <li><strong>Waiting:</strong> a timer counts down, for a break or a ferry. Continue
          when it reaches zero.</li>
        <li><strong>Reading:</strong> read it and tap Continue.</li>
      </UL>
      <p>
        If your hosts limited how far apart your team may be, you can't submit answers
        until you are back together.
      </p>
      <p>
        Answers are checked online. Without a signal the app says so; try again once you
        have one. Getting to a place or walking a distance still counts, and arrives by
        itself when the signal is back.
      </p>

      <H2 id="hints">Hints and coins</H2>
      <p>
        Your team earns coins for every quest it solves; your balance is in the pill at
        the top left. Spend them on hints for the quest you are stuck on, or in the
        shop. Coins belong to the whole team.
      </p>

      <H2 id="items">Shop items</H2>
      <p>
        Tap the coin pill to open the shop. Which items are on sale, and their prices,
        depend on your race. Teams that have finished can't buy anything.
      </p>
      <div className="space-y-3">
        {SHOP_ITEMS.map(item => (
          <div key={item.type} className="flex gap-3 border border-gray-200 rounded-lg p-4">
            <Icon name={item.icon} size={22} className="text-gray-700 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">{item.name}</p>
              <p className="text-sm">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      <H2 id="targeted">When another team uses an item on you</H2>
      <UL>
        <li><strong>Cursed:</strong> your screen shows who cursed you and a countdown. Until
          it wears off you can't see the hint, answer or shop, and steps you take don't
          count.</li>
        <li><strong>Robbed</strong> or <strong>given coins:</strong> your balance changes and
          you get a notification.</li>
        <li><strong>Shield:</strong> if your team has one, it stops the next curse or robbery
          and is used up. The pill at the top left shows a shield while you have one.</li>
      </UL>
      <p>
        Curses, robberies and gifts are announced to everyone in the activity feed.
      </p>

      <H2 id="compass">If the compass points the wrong way</H2>
      <p>
        Phone compasses drift. Move your phone in a large figure 8 a few times, away from
        metal and magnetic phone cases. The app shows a reminder when your phone reports
        that its compass needs this.
      </p>

      <H2 id="menu">Activity, chat and teams</H2>
      <p>The menu button at the top right opens three tabs:</p>
      <UL>
        <li><strong>Activity:</strong> every quest solved, by every team, as it happens. What
          your team buys and what your hosts give you are only shown to your team, until the
          recap after the race.</li>
        <li><strong>Chat:</strong> your team's conversation with the hosts. Other teams can't
          read it. If your hosts left a number, you can call them from here.</li>
        <li><strong>Teams:</strong> the standings.</li>
      </UL>
      <p>A red dot on the menu button means something new happened.</p>

      <H2 id="recap">After the race: the recap</H2>
      <p>
        Once the race is over, your hosts can share a recap. When they do, you get a
        notification and the end screen shows <strong>See the recap</strong>. Tap Next to step
        through it:
      </p>
      <UL>
        <li><strong>The race:</strong> every team's route on the map, sped up. It slows down
          and zooms in on curses, robberies, shields, gifts and finishes. Drag, pinch or use
          the + and − buttons to look around; that pauses the replay, and Play carries on.</li>
        <li><strong>Places over time:</strong> where each team stood during the race. Tap a
          team to follow its line.</li>
        <li><strong>Awards</strong>, one at a time: most cursed, the archrivals (the two teams
          that went after each other most), Robin Hood, hint lovers and more.</li>
        <li><strong>Your team:</strong> your time, distance, coins, everything you bought and
          your nemesis, the team that attacked you most. Tap another team to see theirs; this is
          where the secrets come out.</li>
        <li><strong>Final standings.</strong></li>
      </UL>

      <H2 id="profile">Your profile</H2>
      <p>The round button with your initial at the top right lets you:</p>
      <UL>
        <li><strong>Leave the game:</strong> your team keeps its progress, and you can rejoin
          with the invite code.</li>
        <li><strong>Report a problem</strong> with the game, a host or a player.</li>
        <li><strong>Delete your account</strong>, immediately and for good.</li>
      </UL>

      <H2 id="help">Need help?</H2>
      <p>
        During a race, message your hosts. For anything else, see the{' '}
        <a className="underline" href="/support">support page</a>.
      </p>
    </LegalLayout>
  );
}
