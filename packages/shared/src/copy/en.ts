// Every word the player app shows, in one place.
//
// Edit freely: text in quotes is shown as written. Where a sentence contains
// something that changes (a name, a number), it is a small function — keep
// the ${...} parts, move them around as the sentence needs.
//
// Adding a language later means copying this file (e.g. de.ts) and
// translating it; TypeScript then refuses to build until every entry exists.
// Sentences get everything they might need, even where English ignores it
// (`mine` in the feed: other languages change the verb for "you").

const pad = (n: number) => String(n).padStart(2, '0');
const coins = (n: number) => `${n} coin${n === 1 ? '' : 's'}`;

function ordinal(n: number): string {
  if (n >= 11 && n <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

export const en = {
  // ── Bits used in several places ──────────────────────────────────────────
  common: {
    cancel: 'Cancel',
    namelessPlayer: 'A nameless player',
    howToPlay: 'How to play',
    reportProblem: 'Report a problem',
    deleteAccount: 'Delete account',
    signOut: 'Sign out',
    coins,
    ordinal,
    // Race times, e.g. "1h 05m 09s" or "4m 30s"
    duration: (h: number, m: number, s: number) =>
      h > 0 ? `${h}h ${pad(m)}m ${pad(s)}s` : `${m}m ${pad(s)}s`,
    metersAway: (m: number) => `${m} m away`,
  },

  // ── Signing in and up ────────────────────────────────────────────────────
  login: {
    title: 'GCR',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign In',
    createAccount: 'Create Account',
    failedTitle: 'Sign in failed',
    failedMessage: 'Invalid email or password.',
  },
  signUp: {
    title: 'Create Account',
    name: 'Your name',
    email: 'Email',
    password: 'Password',
    // The three links are passed in; keep them, reorder as needed
    agree: <T>(terms: T, privacy: T, guidelines: T) =>
      ['I agree to the ', terms, ', ', privacy, ' and ', guidelines, '.'],
    terms: 'terms',
    privacy: 'privacy policy',
    guidelines: 'community guidelines',
    button: 'Create Account',
    fillAll: 'Please fill in all fields.',
    badEmail: 'That email address doesn’t look right.',
    shortPassword: (min: number) => `Pick a password with at least ${min} characters.`,
    acceptTerms: 'Please accept the terms to continue.',
  },
  // Firebase's own error codes, turned into sentences (sign-up and sign-in)
  authErrors: {
    'auth/invalid-email': 'That email address doesn’t look right.',
    'auth/missing-email': 'Enter your email address.',
    'auth/email-already-in-use': 'There’s already an account with that email. Try signing in instead.',
    'auth/weak-password': 'Pick a password with at least 6 characters.',
    'auth/missing-password': 'Enter a password.',
    'auth/wrong-password': 'That email and password don’t match.',
    'auth/invalid-credential': 'That email and password don’t match.',
    'auth/user-not-found': 'No account with that email. Sign up first.',
    'auth/user-disabled': 'That account has been disabled.',
    'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
    'auth/network-request-failed': 'Can’t reach the server. Check your connection.',
    'auth/requires-recent-login': 'For safety, sign in again before doing that.',
    fallback: 'Something went wrong. Please try again.',
  } as Record<string, string>,

  // When this build is too old for the game's data (see version.ts)
  update: {
    heading: 'Time for an update',
    message: 'This version of Grand City Race no longer works with the game. Update the app to keep playing.',
    button: 'Update',
  },

  // Shown to platform admins who open the app instead of the console
  adminHome: {
    title: 'GCR',
    heading: 'Hey, Admin!',
    message: 'Looking for the admin panel?',
    open: 'Open Admin Panel',
    signOut: 'Sign Out',
  },

  // ── Getting into a race ──────────────────────────────────────────────────
  join: {
    title: 'Join a game',
    intro: 'Enter the invite code. Ask whoever\'s hosting if you don\'t have it.',
    button: 'Join',
    noGame: 'No games with that code. Check it with whoever\'s hosting.',
    finished: 'That game has already finished.',
    failed: 'Couldn\'t join just now. Check your connection and try again.',
  },
  teamPicker: {
    welcome: 'Welcome to',
    theGame: 'the game',
    joinATeam: 'Join a team',
    // e.g. "3 / 4 · full"
    members: (count: number, max: number | null, full: boolean) =>
      `${count}${max ? ` / ${max}` : ''}${full ? ' · full' : ''}`,
    nobodyHere: 'Nobody here yet.',
    teamFull: 'This team is full.',
    join: (team: string) => `Join ${team}`,
    gameFull: (max: number) => `This game already has ${max} teams. Join one of them.`,
    startOwn: 'Or start your own',
    startFirst: 'Start the first team',
    teamColour: 'Team colour',
    chosenColour: 'Chosen colour',
    colour: 'Colour',
    teamName: 'Team name',
    createTeam: 'Create team',
    leaveGame: 'Leave this game',
    joinFailed: 'Couldn\'t join that team. Someone may have just filled it.',
    createFailed: 'Couldn\'t create that team. Try again.',
    leaveFailed: 'Couldn\'t leave the game. Try again.',
  },
  // The explainer before the permission prompts. The location wording is what
  // Google Play requires: what is collected, what for, and that it happens
  // when the app is closed or not in use.
  permissions: {
    title: 'Before you start',
    location: 'Location',
    locationWhat:
      'Grand City Race collects location data to unlock quests, count how far your team walks and show your hosts where your team is, even when the app is closed or not in use.',
    locationWho: (choice: string) =>
      `This only happens while your race is running, from the start until you finish. Your location is shared with the hosts of that game and nobody else. Choosing ${choice} keeps the race going while your phone is in your pocket.`,
    alwaysIos: '“Always”',
    alwaysAndroid: '“Allow all the time”',
    notifications: 'Notifications',
    notificationsWhat: 'Used to inform you about things happening in your game, nothing else.',
    footnote: 'Your location is only collected during a game and is deleted when you delete your account.',
    gotIt: 'Got it',
    nextNote: 'You\'ll be asked for those permissions next. You can say no to either.',
  },
  // The notification Android shows while background location runs
  backgroundLocation: {
    title: 'Your race is on',
    body: 'Grand City Race uses your location to keep track of your team’s location until your race is over.',
  },

  // ── The race ─────────────────────────────────────────────────────────────
  waiting: {
    getReady: 'GET READY',
    startsIn: 'starts in',
  },
  navigation: {
    findNext: 'FIND THE NEXT QUEST',
    keepMoving: 'KEEP MOVING',
    walked: (walked: number, target: number) => `${walked} / ${target} m`,
  },
  compass: {
    meta: (fromNorth: boolean, left: string) => `${fromNorth ? 'from north · ' : ''}compass ${left}`,
    calibrate: 'Move your phone in a figure 8 to calibrate the compass',
  },
  radar: {
    finding: 'Finding you…',
    meta: (left: string) => `radar ${left}`,
  },
  quest: {
    number: (n: number, total: number) => `Quest ${n} of ${total}`,
    answer: 'Your answer…',
    wrong: 'That\'s not right. Try again.',
    continue: 'Continue',
    timeUp: 'time\'s up',
    continueIn: 'continue in',
    none: 'No quests available yet.',
  },
  hints: {
    label: (n: number) => `HINT ${n}`,
    reveal: (another: boolean, cost: number) => `Reveal ${another ? 'another ' : 'a '}hint · ${cost} coins`,
    notEnough: (cost: number) => `Not enough coins (${cost} needed)`,
  },
  celebration: 'Well done!',
  spread: {
    title: 'Your team is too spread out',
    message: 'Get closer together before you can submit an answer.',
  },
  cursed: {
    heading: 'Cursed!',
    by: (team: string) => `by ${team}`,
    anotherTeam: 'another team',
    message: 'Tough luck! No hints, no answers and no shop until it wears off.',
  },
  locationDenied: {
    heading: 'Location access needed',
    message: 'This game uses your location to unlock quests. Please enable location access in your device settings.',
  },
  finished: {
    heading: 'You finished!',
    placement: (rank: number) => `${ordinal(rank)} place`,
    seeLeaderboard: 'See leaderboard',
  },
  paused: {
    heading: 'Game paused',
    message: 'The hosts have paused the game.\nSit tight!',
  },
  ended: {
    heading: 'The hosts have ended the game.',
    thanks: 'Thanks for playing!',
  },

  // ── The recap, once the hosts show it ────────────────────────────────────
  recap: {
    open: 'See the recap',
    close: 'Close',
    loading: 'Loading the recap…',
    notReady: 'The recap isn’t ready yet. Your hosts will let you know when it is.',
    next: 'Next',
    back: 'Back',
    again: 'Watch again',
    play: 'Play',
    pause: 'Pause',
    duration: (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.round((seconds % 3600) / 60);
      return h ? `${h} h ${pad(m)} min` : `${m} min`;
    },
    distance: (meters: number) => `${(meters / 1000).toFixed(1)} km`,
    intro: {
      kicker: 'Race recap',
      when: (city: string, date: string) => `${city} · ${date}`,
      teams: (n: number) => `${n} teams`,
      quests: (n: number) => `${n} quests`,
      covered: (distance: string) => `${distance} covered`,
    },
    replay: {
      heading: 'The race',
      hint: 'Every team’s route, sped up. Routes are approximate.',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
    },
    // The ticker under the replay map
    events: {
      curse: (team: string, target: string) => `${team} cursed ${target}`,
      robbery: (team: string, target: string, n: number) => `${team} robbed ${coins(n)} from ${target}`,
      blocked: (team: string, target: string, robbery: boolean) =>
        `${target}’s shield stopped ${team}’s ${robbery ? 'robbery' : 'curse'}`,
      donation: (team: string, target: string, n: number) => `${team} gave ${target} ${coins(n)}`,
      finish: (team: string, place: number) => `${team} finished ${ordinal(place)}`,
    },
    places: {
      heading: 'Places over time',
      hint: 'Where each team stood on the leaderboard during the race. Tap a team to follow its line.',
      place: (n: number) => ordinal(n),
    },
    awards: {
      heading: 'Awards',
      none: 'No awards this time. A very peaceful race.',
      mostCursed: { title: 'Most cursed', text: (n: number) => `Cursed ${n} ${n === 1 ? 'time' : 'times'}. Clearly the team to beat.` },
      curseMaster: { title: 'Curse master', text: (n: number) => `Cast ${n} ${n === 1 ? 'curse' : 'curses'} on other teams.` },
      archrivals: { title: 'Archrivals', text: (n: number) => `${n} attacks on each other. Curses, robberies, shields: nothing was left untried.` },
      // A line of the archrivals' score, e.g. "Junimos → Belasto: 3×"
      feud: (from: string, to: string, n: number) => `${from} → ${to}: ${n}×`,
      robinHood: { title: 'Robin Hood', text: (n: number) => `Stole ${coins(n)} from other teams.` },
      shieldWall: { title: 'Shield wall', text: (n: number) => `Their shields stopped ${n} ${n === 1 ? 'attack' : 'attacks'}.` },
      bouncedOff: { title: 'Bounced off', text: (n: number) => `Ran into a shield ${n === 1 ? 'once' : `${n} times`}. The coins were gone anyway.` },
      wastedShield: { title: 'Just in case', text: (n: number) => `Finished with ${n === 1 ? 'a shield' : `${n} shields`} nobody ever tested.` },
      hintLovers: { title: 'Hint lovers', text: (n: number) => `Bought ${n} ${n === 1 ? 'hint' : 'hints'}.` },
      noHints: { title: 'No hints needed', text: (_n: number) => 'Didn’t buy a single hint.' },
      scrooge: { title: 'Scrooge', text: (n: number) => `Finished with ${coins(n)} unspent. Coins don’t count at the finish…` },
      bigSpender: { title: 'Big spender', text: (n: number) => `Spent ${coins(n)}.` },
      generous: { title: 'Generous', text: (n: number) => `Gave away ${coins(n)}.` },
      marathon: { title: 'Globetrotters', text: (meters: number) => `Covered about ${(meters / 1000).toFixed(1)} km.` },
      comeback: { title: 'Comeback', text: (n: number) => `Climbed ${n} places from their lowest point.` },
    },
    team: {
      heading: 'Your team',
      allTeams: 'All teams',
      place: (n: number) => `${ordinal(n)} place`,
      finishedAfter: (duration: string) => `Finished after ${duration}`,
      questsSolved: (n: number, total: number) => `${n} of ${total} quests`,
      distance: 'Distance',
      hints: 'Hints bought',
      earned: 'Coins earned',
      spent: 'Coins spent',
      left: 'Coins left',
      bought: 'Bought',
      boughtNothing: 'Nothing from the shop',
      cursed: 'Cursed others',
      wasCursed: 'Got cursed',
      stole: 'Stole',
      lost: 'Lost to robbers',
      gave: 'Gave away',
      got: 'Got as gifts',
      blocked: 'Attacks stopped by a shield',
      nemesis: 'Nemesis',
      nemesisValue: (team: string, n: number) => `${team} (${n}×)`,
      times: (n: number) => `${n}×`,
      coins,
    },
    standings: {
      heading: 'Final standings',
      finished: (duration: string) => `Finished after ${duration}`,
      quests: (n: number, total: number) => `${n} of ${total} quests`,
    },
  },

  // ── The sheet behind the menu button ─────────────────────────────────────
  tabs: {
    activity: 'Activity',
    chat: 'Chat',
    board: 'Teams',
    unread: (n: number) => ` (${n})`,
  },
  activity: {
    empty: 'Nothing has happened yet.',
    onlyYourTeam: 'Only your team',
  },
  chat: {
    somethingWrong: 'Something wrong?',
    callHosts: 'Call the hosts',
    empty: 'Chat with your hosts.',
    hosts: 'Hosts',
    seen: 'Seen',
    placeholder: 'Write a message…',
  },
  board: {
    you: ' (you)',
    finished: (duration: string) => `Finished · ${duration}`,
    progress: (done: number, total: number) => `${done} / ${total} quests`,
  },

  // ── Profile ──────────────────────────────────────────────────────────────
  profile: {
    leaveGame: 'Leave game',
    leaveConfirm: 'Leave this game? You can always rejoin with the invite code.',
    leaving: 'Leaving…',
    privacy: 'Privacy & terms',
  },
  deleteAccount: {
    title: 'Delete your account',
    what: 'This removes your account, your profile and your location history, and deletes the messages you sent to the organizers. It cannot be undone.',
    team: 'Your team keeps the quests it has solved, so the race carries on for everyone else.',
    confirm: 'Confirm your password',
    password: 'Password',
    deleting: 'Deleting…',
    button: 'Delete my account',
    wrongPassword: 'That password is not right.',
    failed: 'Couldn\'t delete the account just now. Try again.',
  },
  // The email "Report a problem" opens
  report: {
    subject: (game: string | null | undefined) => `Report: ${game ?? 'Grand City Race'}`,
    whatHappened: 'What happened?',
    keepLines: '— Please keep the lines below, they help us find the game —',
    game: (name: string | null | undefined, id: string | null | undefined) =>
      `Game: ${name ?? 'unknown'} (${id ?? 'no id'})`,
    team: (team: string) => `Team: ${team}`,
  },
  openInYouTube: 'Open in YouTube',

  // ── The shop ─────────────────────────────────────────────────────────────
  shop: {
    title: 'Shop',
    closed: 'The shop is closed for this game.',
    price: (n: number) => (n > 0 ? `${n} coins` : 'Free'),
    lasts: (minutes: number) => ` Lasts ${minutes} min.`,
    running: (left: string) => `Running · ${left} left`,
    needMore: (n: number) => `You need ${n} more coins`,
    shields: (n: number) => `Your team has ${n} ${n === 1 ? 'shield' : 'shields'}`,
    giveTo: 'Give to',
    useOn: 'Use on',
    amount: 'How many coins',
    buy: 'Buy',
    buying: 'Buying…',
    working: 'Working…',
    active: 'Active',
    chooseTeam: 'Choose team',
    give: (n: number) => `Give ${n || ''}`.trim(),
    // Why something can't be bought right now
    notOnTeam: 'You\'re not on a team',
    raceOver: 'Your race is over',
    youreCursed: 'You’re cursed',
    notRunning: 'The shop opens when the race is running',
    nothingToPoint: 'Nothing to point at on this quest',
    alreadyThere: 'You’re already there',
    noOtherTeams: 'No other teams yet',
    // What happened, after using an item on another team
    cursed: (team: string, minutes: number) => `${team} is cursed for ${minutes} min.`,
    robbed: (n: number, team: string) =>
      n > 0 ? `You stole ${coins(n)} from ${team}.` : `${team} had nothing to steal.`,
    blocked: (team: string) => `${team} had a shield. It’s gone now, and so are your coins, tough luck!`,
    donated: (n: number, team: string) => `You gave ${team} ${coins(n)}.`,
  },
  // Item names and descriptions: shown in the app, the console and the manuals.
  // `bought` is how the activity feed names one ("You bought a compass").
  items: {
    compass: {
      name: 'Compass',
      description: 'Shows the direction to the next quest and how far away it is.',
      bought: 'a compass',
    },
    radar: {
      name: 'Radar',
      description: 'Pings faster the closer you get to the next quest, and shows how far away it is, but not which way.',
      bought: 'a radar',
    },
    shield: {
      name: 'Shield',
      description: 'Blocks the next curse or robbery against your team, then it breaks. Other teams can’t see you have one.',
      bought: 'a shield',
    },
    curse: {
      name: 'Curse',
      description: 'Freezes another team for a while: no answers, no navigation hint, no shopping, no nothing.',
      bought: 'a curse',
    },
    robbery: {
      name: 'Robbery',
      description: 'Steals a share of another team’s coins. You pay even if they have no coins to steal or have a shield. A robbed team can’t be robbed again for a while.',
      bought: 'a robbery',
    },
    donate: {
      name: 'Donate',
      description: 'Give some of your coins to another team. Helps with alliances, deals, or peace offerings.',
      bought: 'a donation',
    },
  },

  // ── The activity feed ────────────────────────────────────────────────────
  // Read by players and hosts. `who` is "You" for the reader's own team, or
  // the team's name; `mine` says which. Targets work the same way.
  feed: {
    you: 'You',
    youObject: 'you',
    aTeam: 'A team',
    aTeamObject: 'a team',
    aQuest: 'a quest',
    anItem: 'an item',
    quoted: (title: string) => `“${title}”`,
    questSolved: (p: { who: string; mine: boolean; questTitle?: string; questNumber?: number }) =>
      p.questTitle
        ? `${p.who} solved “${p.questTitle}”${p.questNumber ? ` (quest ${p.questNumber})` : ''}`
        : p.questNumber
          ? `${p.who} solved quest ${p.questNumber}`
          : `${p.who} solved a quest`,
    teamFinished: (p: { who: string; mine: boolean; placement?: number }) =>
      p.placement ? `${p.who} finished in ${ordinal(p.placement)} place` : `${p.who} finished the race`,
    hintRevealed: (p: { who: string; mine: boolean; quest: string; amount: number }) =>
      `${p.who} revealed a hint on ${p.quest} for ${p.amount} coins`,
    itemBought: (p: { who: string; mine: boolean; item: string; amount: number }) =>
      `${p.who} bought ${p.item} for ${p.amount} coins`,
    coinsAdjusted: (p: { who: string; mine: boolean; amount: number; reason?: string }) =>
      `Hosts ${p.amount >= 0 ? `gave ${p.who} ${p.amount} coins` : `took ${Math.abs(p.amount)} coins from ${p.who}`}${p.reason ? ` — ${p.reason}` : ''}`,
    gameStarted: 'The game started',
    gamePaused: 'The game was paused',
    gameResumed: 'The game resumed',
    gameEnded: 'The hosts ended the game',
    teamCursed: (p: { who: string; mine: boolean; target: string; targetMine: boolean; minutes?: number }) =>
      `${p.who} cursed ${p.target}${p.minutes ? ` for ${p.minutes} min` : ''}`,
    teamRobbed: (p: { who: string; mine: boolean; target: string; targetMine: boolean; amount: number }) =>
      `${p.who} robbed ${p.target} of ${coins(p.amount)}`,
    coinsDonated: (p: { who: string; mine: boolean; target: string; targetMine: boolean; amount: number }) =>
      `${p.who} gave ${p.target} ${coins(p.amount)}`,
    // e.g. "Your shield blocked Night Owls’s curse"
    attackBlocked: (p: { team: string; mine: boolean; target: string; targetMine: boolean; robbery: boolean }) =>
      `${p.targetMine ? 'Your' : `${p.target}’s`} shield blocked ${p.mine ? 'your' : `${p.team}’s`} ${p.robbery ? 'robbery' : 'curse'}`,
    adminMarkedSolved: (p: { who: string; mine: boolean; quest: string }) =>
      `Hosts marked ${p.quest} as solved for ${p.who}`,
    adminMoved: (p: { who: string; mine: boolean; quest: string }) =>
      `Hosts moved ${p.who} to ${p.quest}`,
    adminFinished: (p: { team: string; mine: boolean }) =>
      `Hosts marked ${p.mine ? 'your race' : `${p.team}'s race`} as finished`,
    adminUnfinished: (p: { team: string; mine: boolean }) =>
      `Hosts reopened ${p.mine ? 'your race' : `${p.team}'s race`}`,
  },

  // ── Themes a host picks (names shown in the console) ─────────────────────
  themes: {
    basic: { name: 'Basic', description: 'Clean black on white.' },
    retro: { name: 'Retro', description: 'Mid-century tangerine, cool blue, black cherry.' },
    night: { name: 'Night', description: 'Deep navy and taxi yellow, for races after dark.' },
    arcade: { name: 'Arcade', description: 'Black, neon and pixels, like an old arcade cabinet.' },
    bern: { name: 'Bern', description: 'Sandstone, the red of the city flag and the blue-green of the Aare.' },
  },

  // ── Messages from the server ─────────────────────────────────────────────
  network: {
    signInFirst: 'Sign in first',
    noConnection: 'No connection. Try again.',
    somethingWrong: 'Something went wrong. Try again.',
    sessionExpired: 'Your sign-in has expired. Sign in again.',
  },
  server: {
    badRequest: 'Bad request',
    noGame: 'This game no longer exists',
    gameOver: 'The game is over',
    gamePaused: 'The game is paused',
    notStarted: 'The game hasn’t started yet',
    notForSale: (item: string) => `${item} isn’t for sale in this game`,
    notOnTeam: 'You aren’t on a team in this game',
    pickAnother: 'Pick another team',
    raceOver: 'Your race is over',
    youreCursed: 'You’re cursed',
    notInGame: 'That team isn’t in this game',
    chooseAmount: 'Choose how many coins to give',
    notEnoughCoins: 'Not enough coins',
    alreadyFinished: (team: string) => `${team} has already finished`,
    alreadyCursed: (team: string) => `${team} is already cursed`,
    robbedRecently: (team: string) => `${team} was robbed recently. Try again later.`,
    // Push notifications to the team on the receiving end
    pushBlocked: (attacker: string, item: string) => ['Your shield broke!', `But it blocked ${attacker}’s ${item}.`] as const,
    pushCursed: (attacker: string, minutes: number) => ['Cursed!', `${attacker} cursed your team for ${minutes} min.`] as const,
    pushRobbed: (attacker: string, n: number) => ['Robbed!', `${attacker} stole ${coins(n)} from your team.`] as const,
    pushDonated: (giver: string, n: number) => ['A gift!', `${giver} gave your team ${coins(n)}.`] as const,
    // Hosts and push
    hostsOnly: 'Only this game’s hosts can do that',
    adminsOnly: 'Only admins can do that',
    deleteYourself: 'Delete your own account from your profile in the app',
    pushHostsOnly: 'Only this game’s hosts can send push',
    enterEmail: 'Enter an email address',
    noAccount: 'No account with that email. They need to sign up first.',
    notAHost: 'Not a host of this game',
    lastHost: 'A game needs at least one host',
    aHost: 'A host',
    missingKey: 'The server is missing its Firebase key. Try again later.',
  },

  // ── Push notifications hosts send from the console ───────────────────────
  // Each is a title and a body; announcements and chat replies carry the
  // host's own words as the body.
  hostPush: {
    started: ['The game has started!', 'Good luck — your first quest awaits.'] as const,
    paused: ['Game paused', 'The hosts have paused the game. Sit tight!'] as const,
    resumed: ['Game resumed', 'The game is back on — keep going!'] as const,
    ended: ['Game over', 'The hosts have ended the game. Thanks for playing!'] as const,
    recap: ['The recap is here', 'See how the race went, and what really happened.'] as const,
    announcement: 'Announcement',
    chatReply: 'Message from the hosts',
  },
};

export type Copy = typeof en;
