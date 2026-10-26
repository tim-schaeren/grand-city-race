// Every word the hosts' console shows, in one place. The player app's words
// are in en.ts; texts both share (items, themes, the activity feed) live there.
//
// Edit freely: text in quotes is shown as written. Where a sentence contains
// something that changes, it is a small function — keep the ${p...} parts and
// move them around as the sentence needs. Sentences with a highlighted part
// ("Type <b>END</b> to confirm") return a list of pieces; keep every p... in it.
//
// The names (left of the colon) were generated from the first words of each
// text and may no longer match once the text changes. That's fine; they are
// only labels.

export const consoleEn = {
  // ── Parts every page uses ─────────────────────────────────────────────────
  confirm: {
    typeToConfirm: (p: { text: string }) => `To confirm, type “${p.text}”.`,
    cancel: "Cancel",
    working: "Working…",
  },

  ui: {
    loading: "Loading…",
    couldNotLoad: "This couldn’t be loaded. Check your connection and reload the page.",
  },

  // ── The frame around every page: games, phases, account ───────────────────
  shell: {
    brand: "Grand City Race",
    prepare: "Prepare",
    race: "Race",
    after: "After",
    overview: "Overview",
    quests: "Quests",
    shop: "Shop",
    teams: "Teams",
    settings: "Settings",
    testRun: "Test run",
    controls: "Control",
    map: "Map",
    feed: "Feed",
    chat: "Chat",
    results: "Results",
    recap: "Recap",
    allGames: "All games",
    newGame: "New game",
    account: "Account",
    hostingGuide: "Hosting guide",
    appearance: "Appearance",
    appearances: { system: "Like the system", light: "Light", dark: "Dark" },
    users: "Users",
    signOut: "Sign out",
  },

  // ── The list of a host's games ────────────────────────────────────────────
  gamesHome: {
    held: "Didn't start: problems to fix",
    title: "Your games",
    welcome: "Welcome to Grand City Race",
    welcomeHint: "Start with a name, a city and a date.",
    createFirst: "Create your first game",
    starts: (p: { when: string }) => `Starts ${p.when}`,
    started: (p: { when: string }) => `Started ${p.when}`,
    endedOn: (p: { when: string }) => `Ended ${p.when}`,
  },

  // ── Running the race: the bar above every race page ───────────────────────
  raceBar: {
    running: "Running",
    paused: "Paused",
    startsIn: "Not started yet",
    pause: "Pause",
    resume: "Resume",
    end: "End race",
    endTitle: "End the race?",
    endBody: "Teams can't go on. This can't be undone.",
    endForGood: "End the race",
    cancel: "Cancel",
  },

  // ── The game checker and the checklist on the overview ────────────────────
  checker: {
    noQuests: "No quests yet.",
    noText: (p: { n: number }) => `Quest ${p.n}: nothing to read on arrival.`,
    noPlace: (p: { n: number }) => `Quest ${p.n}: no place set.`,
    noNavigationHint: (p: { n: number }) => `Quest ${p.n}: no navigation hint.`,
    smallFence: (p: { n: number; m: number }) => `Quest ${p.n}: a ${p.m} m fence is small. GPS can be off by 10–30 m.`,
    noDistance: (p: { n: number }) => `Quest ${p.n}: no distance set.`,
    noAnswers: (p: { n: number }) => `Quest ${p.n}: no accepted answers.`,
    noTimer: (p: { n: number }) => `Quest ${p.n}: the wait has no length.`,
    hintUnaffordable: (p: { n: number; coins: number; cost: number }) => `Quest ${p.n}: teams have ${p.coins} coins by then, a hint costs ${p.cost}.`,
    fencesOverlap: (p: { a: number; b: number }) => `Quest ${p.b} unlocks where quest ${p.a} ends: their fences overlap.`,
    notInOrder: (p: { n: number }) => `${p.n} ${p.n === 1 ? 'quest is' : 'quests are'} not in the chain.`,
    skipped: (p: { n: number }) => `${p.n} inactive ${p.n === 1 ? 'quest' : 'quests'}.`,
    noPlayers: "Nobody has joined yet.",
    teamless: (p: { n: number }) => `${p.n} ${p.n === 1 ? 'player' : 'players'} without a team.`,
    title: "Game checker",
    allGood: "Nothing to fix.",
    fix: "Fix",
    show: "Show",
    problem: "Problem",
    warning: "Warning",
    note: "Note",
  },

  checklist: {
    title: "Getting ready",
    progress: (p: { done: number; of: number }) => `${p.done} of ${p.of} done`,
    basics: "Set up the game",
    basicsWhy: "",
    quests: "Create quests",
    questsWhy: "In the order teams play them, each with its place, text and answers.",
    shop: "Set up the shop",
    shopWhy: "Optional: items teams can buy.",
    test: "Test it all",
    testWhy: "Play it on your phone first.",
    invite: "Invite players",
    inviteWhy: "Players join with the invite code.",
    guide: "Guide me through it",

  },

  results: {
    title: "Results",
    notOver: "The race isn't over yet.",
    toRecap: "Recap →",
    standings: "Final standings",
    standingsSoFar: "Standings so far",
    corrections: "Fix a team's result on its page, then build the recap again.",
    noTeams: "No teams took part.",
    team: "Team",
    result: "Result",
    coins: "Coins",
    finishedIn: (p: { time: string }) => `finished in ${p.time}`,
    solved: (p: { n: number; of: number }) => `${p.n} of ${p.of} quests`,
    reset: "Reset the game",
    resetTitle: "Reset the game?",
    resetConfirm: "Progress, coins, the feed, chat and the recap are cleared. Teams and players stay.",
    newStart: (p: { zone: string }) => `New start (${p.zone})`,
    cancel: "Cancel",
  },

  overview: {
    toRaceControl: "Race control →",
    startPanel: "Starting the race",
    startsBy: (p: { when: string }) => `Starts by itself on ${p.when}.`,
    startsOnceFixed: (p: { when: string }) => `Starts on ${p.when}, if the problems are fixed by then.`,
    didntStart: (p: { when: string }) => `Didn't start on ${p.when}: it has problems. Fix them, then start it.`,
    waitingForYou: (p: { when: string }) => `Didn't start on ${p.when}. Start it when you're ready.`,
    fixFirst: (p: { n: number }) => `Fix ${p.n === 1 ? 'the problem' : `the ${p.n} problems`} first.`,
    beforeYouStart: "Before you start:",
    startTitle: "Start the race now?",
    startBody: "Every team gets its first quest. This can't be undone.",
    startForGood: "Start the race",
  },

  guide: {
    step: (p: { n: number; of: number }) => `Step ${p.n} of ${p.of}`,
    stepDone: "Done.",
    next: (p: { step: string }) => `Next: ${p.step} →`,
    finishAll: "Finish →",
    skip: "Skip for now",
    back: "← Back",
    backToStep: "Back to this step",
    done: "All set. The race is ready to go.",
    finish: "Close the guide",
    leave: "Leave the guide",
  },


  // ── A test run: the race played on a phone before it starts ──────────────
  testRun: {
    title: "Test run",
    description: "Play the race on your phone before it starts.",
    start: "Start a test run",
    raceStarted: "Test runs are only possible before the race starts.",
    onYourPhone: "On your phone",
    scan: "Scan with your phone's camera to open the app on the test team.",
    copyLink: "Copy link",
    copied: "Copied",
    newLink: "New link",
    newLinkHelp: "A new link stops the old one working.",
    testing: "Testing now",
    nobodyYet: "Nobody has opened the link yet.",
    team: "The test team",
    finished: "It has finished the race.",
    onQuest: (p: { n: number; of: number; title: string }) => `On quest ${p.n} of ${p.of}: ${p.title}`,
    lookingForIt: "looking for it",
    arrived: "arrived",
    coins: (p: { n: number }) => `${p.n} coins`,
    cursed: "cursed",
    shields: (p: { n: number }) => `${p.n} ${p.n === 1 ? 'shield' : 'shields'}`,
    arrive: "Arrive at the place",
    arriveHelp: "As if a phone were inside the fence, or the distance walked.",
    moveHere: "Put the team here",
    current: "now",
    giveCoins: (p: { n: number }) => `Give ${p.n} coins`,
    coinsReason: "Test run",
    curse: "Send a curse",
    rob: "Send a robbery",
    restart: "Start over",
    restartHelp: "Back to quest 1 with the starting coins.",
    end: "End the test run",
    endTitle: "End the test run?",
    endHelp: "Everyone on the test team leaves it.",

  },

  // ── Race control: the race on one screen ──────────────────────────────────
  raceControl: {
    alerts: "Needs attention",
    allQuiet: "All quiet.",
    wrote: (p: { text: string }) => `wrote: “${p.text}”`,
    reply: "Reply",
    stuck: (p: { n: number }) => `${p.n} wrong answers on`,
    questN: (p: { n: number }) => `quest ${p.n}`,
    noPositionFor: (p: { time: string }) => `no position for ${p.time}`,
    noPositionYet: "no position yet",
    minutes: (p: { n: number }) => (p.n < 60 ? `${p.n} min` : `${Math.floor(p.n / 60)} h ${p.n % 60} min`),
    standings: "Standings",
    noTeams: "No teams yet.",
    finished: (p: { time: string }) => `finished in ${p.time}`,
    onQuest: (p: { n: number; of: number }) => `quest ${p.n} of ${p.of}`,
    atTheSpot: "at the spot",
    showOnMap: "Show on the map",
    chat: "Chat",
    noMessages: "No messages yet.",
    allThreads: "← All teams",
    you: "You: ",
    feed: "Feed",
    wholeFeed: "Whole feed →",
    close: "Close",
  },

  // ── Words in the feed's sentences that link to an item's page ─────────────
  // They must match the wording of the feed in en.ts, or the link is left out
  feedLinks: {
    cursed: "cursed",
    robbed: "robbed",
    gave: "gave",
    shield: "shield",
    curse: "curse",
    robbery: "robbery",
    questN: (p: { n: number }) => `quest ${p.n}`,
  },

  // ── Pages for each team, quest, item and player ───────────────────────────
  entities: {
    back: "← Back",
    notFound: "This isn't part of the game any more.",
    justNow: "just now",
    minAgo: (p: { n: number }) => `${p.n} min ago`,
    hoursAgo: (p: { n: number }) => `${p.n} h ago`,
    until: (p: { time: string }) => `until ${p.time}`,
    feed: "Feed",
    feedEmpty: "Nothing in the feed about this yet.",
    showOnMap: "Show on the map",
  },

  teamPage: {
    finished: (p: { time: string }) => `Finished in ${p.time}`,
    onQuest: (p: { n: number; of: number }) => `On quest ${p.n} of ${p.of}`,
    notStarted: "Hasn't started yet",
    adjustCoins: "Adjust coins",
    fixProgress: "Fix progress",
    quests: "Quests",
    solvedAt: (p: { time: string }) => `solved ${p.time}`,
    current: "now",
    hints: (p: { n: number }) => `${p.n} ${p.n === 1 ? 'hint' : 'hints'}`,
    members: "Players",
    noMembers: "Nobody in this team yet.",
    noPosition: "no position yet",
    coins: "Coins",
    coinsNow: (p: { n: number }) => `${p.n} coins now`,
    noAdjustments: "No changes by hosts.",
    adjustedBy: (p: { name: string; time: string }) => `${p.name}, ${p.time}`,
    running: "Running now",
    nothingRunning: "No items running, no curse.",
    shields: (p: { n: number }) => `${p.n} ${p.n === 1 ? 'shield' : 'shields'} ready`,
    cursedBy: (p: { name: string }) => `cursed by ${p.name}`,
    chat: "Chat",
    wrongAnswers: "Wrong answers",
    noWrongAnswers: "None so far.",
  },

  questPage: {
    title: (p: { n: number; of: number; title: string }) => `Quest ${p.n} of ${p.of} · ${p.title}`,
    notInOrder: (p: { title: string }) => `${p.title} (not in the race)`,
    raceDay: "On race day",
    onItNow: "On it now",
    nobodyOnIt: "No team is on it right now.",
    unlocked: (p: { ago: string }) => `arrived ${p.ago}`,
    onTheWay: "on the way",
    solvedBy: "Solved by",
    nobodySolved: "No team has solved it yet.",
    wrongAnswers: "Wrong answers",
    noWrongAnswers: "None so far.",
    timesBy: (p: { n: number }) => `${p.n}×`,
    unlocksWhere: "Where it unlocks",
    unlocksWhen: "When it unlocks",
    place: (p: { radius: number }) => `Inside the fence: ${p.radius} m around the place`,
    distance: (p: { meters: number }) => `After the team has walked ${p.meters} m`,
  },

  itemPage: {
    available: (p: { price: number }) => `Available for ${p.price} coins`,
    inSale: (p: { price: number }) => `${p.price} coins in the flash sale`,
    off: "Not on sale in this game",
    change: "Change in the Shop",
    settings: "Settings",
    price: "Price",
    running: "Running now",
    nothingRunning: "No team has it running right now.",
    shields: (p: { n: number }) => `${p.n} ready`,
    cooldown: "can't be robbed again yet",
    history: "Bought and used",
    times: (p: { n: number }) => `${p.n} ${p.n === 1 ? 'time' : 'times'} so far`,
    never: "Nobody has bought it yet.",
  },

  playerPage: {
    inTeam: "Plays in",
    noTeam: "Not in a team yet",
    joined: (p: { when: string }) => `Joined ${p.when}`,
    position: "Last position",
    noPosition: "No position yet.",
    moveTo: "Move to team",
    noTeamOption: "No team",
    move: "Move",
    remove: "Remove from game",
    removeTitle: (p: { name: string }) => `Remove ${p.name} from the game?`,
    removeConfirm: "They can rejoin with the invite code.",
    removeForGood: "Remove",
    cancel: "Cancel",
    messages: "Messages to the hosts",
    noMessages: "None so far.",
  },

  // ── Sidebar, game switcher and first-run screen ───────────────────────────
  layout: {
    held: "The race didn't start at its time: it has problems to fix.",
    heldFixed: "The race didn't start at its time. Start it when you're ready.",
    heldShow: "Go to the start",
    unendedRace: (p: { started: string; deletion: string }) =>
      `This race started on ${p.started} and was never ended. Its location trails will be deleted on ${p.deletion}.`,
  },

  // ── Sign in and sign up ───────────────────────────────────────────────────
  loginPage: {
    thatEmailAddressDoesnT: "That email address doesn’t look right.",
    enterYourName: "Enter your name.",
    pickAPasswordWithAt: (p: { minPasswordLength: unknown }) =>
      `Pick a password with at least ${p.minPasswordLength} characters.`,
    pleaseAcceptTheTermsTo: "Please accept the terms to continue.",
    createAnAccountToHost: "Create an account to host a game.",
    signInToRunYour: "Sign in to run your games.",
    yourName: "Your name",
    email: "Email",
    password: "Password",
    terms: "terms",
    privacyPolicy: "privacy policy",
    communityGuidelines: "community guidelines",
    working: "Working…",
    createAccount: "Create account",
    signIn: "Sign in",
    alreadyHaveAnAccount: "Already have an account?",
    wantToHostYourOwn: "Want to host your own game?",
    createAnAccount: "Create an account",
    iAgreeToTheAnd: <T>(p: { link: T; link2: T; link3: T }) =>
      ["I agree to the ", p.link, ",", " ", p.link2, " and", " ", p.link3, "."],
  },

  // ── Game page ─────────────────────────────────────────────────────────────
  gamePage: {
    inZone: (p: { time: unknown; zone: unknown }) => `${p.time} (${p.zone})`,
    upcoming: "Upcoming",
    running: "Running",
    paused: "Paused",
    ended: "Ended",
    scheduledStart: (p: { formatDateTime: unknown }) =>
      `Scheduled start: ${p.formatDateTime}`,
    startNow: "Start now",
    // The word a host types to confirm ending the game
    cancel: "Cancel",
    // The word a host types to confirm resetting the game
  },

  // ── Settings, and the short start of a new game ──────────────────────────
  settings: {
    title: "Settings",
    race: "The race",
    name: "Name",
    namePlaceholder: "e.g. Grand City Race 2026",
    start: "Start",
    timeZone: "Time zone",
    city: "City",
    cityPlaceholder: "e.g. Zurich",
    find: "Find",
    finding: "Finding…",
    pickCity: "Find the city and pick it from the list.",
    noMatches: "No town of that name found.",
    searchFailed: "The search didn't work. Try again.",
    cityOnMap: "On the map",
    teams: "Teams",
    maxTeamSize: "Most players in a team",
    maxTeamSpread: "Most distance between teammates (m)",
    maxTeamSpreadHelp: "Teams can only answer while this close together.",
    noLimit: "No limit",
    hotline: "Hotline number",
    hotlineHelp: "Players can call it from the chat.",
    look: "Look",
    sampleQuest: "Quest 3 of 8",
    sampleTitle: "The old fountain",
    sampleButton: "Continue",
    coins: "Coins",
    startingCoins: "To start with",
    coinsPerQuest: "Per quest solved",
    hintCost: "Per hint",
    save: "Save",
    saving: "Saving…",
    saved: "Saved",
    unsaved: "Unsaved changes",
    discard: "Discard changes",
    required: "This is needed.",
    startInFuture: "Pick a time in the future.",
    zeroOrMore: "0 or more.",
    oneOrMore: "1 or more.",
    deleteTitle: "Delete the game",
    deleteHelp: "Everything in it is deleted. This can't be undone.",
    deleteQuestion: "Delete the game?",
    deleteForGood: "Delete",
    cancel: "Cancel",
    newTitle: "New game",
    create: "Create game",
    creating: "Creating…",
  },


  // ── Hosts (on the Game page) ──────────────────────────────────────────────
  hostsPanel: {
    you: "You",
    aHost: "A host",
    hosts: "Hosts",
    hostsRunThisGameQuests: "Add co-hosts by their account email.",
    noHostsYetOnlyPlatform: "No hosts yet — only platform admins can run this game.",
    you2: " (you)",
    removeTitle: (p: { name: string }) => `Remove ${p.name} as a host?`,
    removeBody: "They can no longer run this game.",
    remove: "Remove",
    cohostExampleCom: "cohost@example.com",
    addHost: "Add host",
    addMeAsHost: "+ Add me as host",
  },

  // ── Invite code (on the Game page) ────────────────────────────────────────
  joinCodePanel: {
    inviteCode: "Invite code",
    playersEnterThisInThe: "Players type it in the app.",
    copied: "Copied",
    copy: "Copy",
    aNewCodeStopsThe: "The old code stops working. Players already in stay in.",
    working: "Working…",
    newCodeTitle: "Make a new invite code?",
    yesNewCode: "Make a new code",
    cancel: "Cancel",
    generateANewCode: "Generate a new code",
    generateInviteCode: "Generate invite code",
  },

  // ── Recap (on the Game page) ──────────────────────────────────────────────
  recapPanel: {
    recap: "Recap",
    description: "A look back at the race.",
    afterTheRace: "You can build the recap once the race has ended.",
    build: "Build recap",
    rebuild: "Build again",
    building: "Building…",
    open: "Open recap",
    show: "Show to players",
    hide: "Hide from players",
    builtAt: (p: { when: unknown }) => `Built ${p.when}.`,
    shownSince: (p: { when: unknown }) => `Players can see it since ${p.when}.`,
    hostsOnly: "Only hosts can see it so far.",
    failed: "The recap couldn't be built. Try again.",
  },
  recapPage: {
    noRecapYet: "This race has no recap yet. Build it on the race's Game page.",
    backToTheConsole: "Back to the console",
  },

  // ── Quests page ───────────────────────────────────────────────────────────
  questsPage: {
    quests: "Quests",
    export: "Export",
    import: "Import",
    newQuest: "+ New quest",
    description: "Drag to reorder.",
    onTheWay: "On the way",
    whenTheyArrive: "When they arrive",
    skipped: "Inactive",
    nothingWritten: "Nothing written yet",
    thisGameHasReachedThe: (p: { maxQuestsPerGame: unknown }) =>
      `This game has reached the limit of ${p.maxQuestsPerGame} quests. Delete one to add another.`,
    noQuestsYetCreateThe: "No quests yet.",
    aGameMayHoldAt: (p: { maxQuestsPerGame: unknown }) =>
      `A game may hold at most ${p.maxQuestsPerGame} quests.`,
  },

  // ── Writing a quest ───────────────────────────────────────────────────────
  questForm: {
    // What's missing before a quest can be saved
    titleIsRequired: "Give the quest a title.",
    aQuestWithThisTitle: "Another quest already has this title.",
    descriptionIsRequired: "Write what teams read when they arrive.",
    navigationHintIsRequired: "Write how teams find this place.",
    fenceRadiusMustBeA: "The fence needs a size in metres.",
    aValidLocationIsRequired: "Click the map to set the place.",
    distanceMustBeAPositive: "The distance needs to be more than 0 m.",
    atLeastOneAnswerIs: "Add at least one accepted answer.",
    durationMustBeAPositive: "The wait needs to be longer than 0 minutes.",
  },


  // ── The quest editor: a quest the way teams live it, with the phone beside it
  questEditor: {
    untitled: "Untitled quest",
    newQuest: "New quest",
    tabQuest: "Quest",
    tabRaceDay: "Race day",
    previousEnds: (p: { n: number }) => `Quest ${p.n} ends with`,
    firstQuest: "The first quest.",
    onTheWay: "1 · On the way here",
    unlocks: "It unlocks",
    navigationHint: "Navigation hint",
    navigationHintHelp: "Only how to find the place. What to do there goes in step 2.",
    navigationPlaceholder: "e.g. Find the tallest church tower in the city",
    distancePlaceholder: "e.g. Head towards the lake",
    place: "The place",
    fence: "Fence (m)",
    fenceHelp: "GPS can be off by 10–30 m.",
    distance: "Distance (m)",
    showProgress: "Show how far they've come",
    rightAway: "Nothing to find: teams go straight to step 2.",
    whenTheyArrive: "2 · When they arrive",
    title: "Title",
    text: "What they read",
    textPlaceholder: "e.g. How many figures stand in the portal?",
    then: "Then they",
    answers: "Accepted answers",
    answersHelp: "Capitals don't matter.",
    answer: (p: { n: number }) => `Answer ${p.n}`,
    addAnswer: "+ Another answer",
    removeAnswer: "Remove answer",
    wrongAnswers: "Wrong answers teams typed",
    accept: "Accept",
    accepted: "accepted",
    hints: "Hints",
    hintsHelp: (p: { price: number }) => `${p.price} coins each.`,
    hint: (p: { n: number }) => `Hint ${p.n}`,
    hintPlaceholder: (p: { n: number }) => `Hint ${p.n}`,
    addHint: "+ Add a hint",
    removeHint: "Remove hint",
    boughtBy: (p: { n: number }) => (p.n === 0 ? 'not bought yet' : `bought by ${p.n} ${p.n === 1 ? 'team' : 'teams'}`),
    minutes: "Minutes",
    inRace: "Active",
    inRaceHelp: "Off: the race skips it.",
    save: "Save",
    saving: "Saving…",
    saved: "Saved",
    unsaved: "Unsaved changes",
    discard: "Discard changes",
    fixFirst: "Some fields need attention before this can be saved.",
    liveWarning: (p: { n: number }) => `${p.n} ${p.n === 1 ? 'team is' : 'teams are'} on this quest and will see your changes at once.`,
    delete: "Delete quest",
    deleteTitle: "Delete this quest?",
    deleteBody: "This can't be undone.",
    deleteMovesTeams: (p: { n: number }) => p.n === 1 ? "The team on it moves on to the next quest." : `The ${p.n} teams on it move on to the next quest.`,
    deleteForGood: "Delete",
    cancel: "Cancel",
    preview: "Phone preview",
    previewMissing: "The phone preview didn't load. Reload the page to try again.",
    changeTheme: "Change theme",
    moments: {
      onTheWay: "On the way",
      compass: "Compass",
      radar: "Radar",
      arrived: "Arrived",
      hint: "Hint bought",
      wrong: "Wrong answer",
    },
  },

  // ── Text, picture and video blocks in a quest ─────────────────────────────
  contentBlocksEditor: {
    imageCouldNotBeLoaded: "Image could not be loaded.",
    text: "Text",
    image: "Image",
    youTube: "YouTube",
    remove: "Remove",
    httpsDirectLinkToA: "Or paste a picture's address",
    imageHelp: "To use a picture that's already online: right-click it in your browser, Copy image address.",
    upload: "Upload a picture",
    uploading: "Uploading…",
    replace: "Replace",
    notAPicture: "That file isn't a picture.",
    tooBig: "That picture is too big. Try a smaller one.",
    captionOptional: "Caption (optional)",
    httpsWwwYoutubeComWatch: "https://www.youtube.com/watch?v=…",
    youTubePreview: "YouTube preview",
    text3: "+ Text",
    image3: "+ Image",
    youTube2: "+ YouTube",
  },

  // ── Picking a place on the map ────────────────────────────────────────────
  locationPicker: {
    clear: <T>(p: { icon: T }) =>
      [p.icon, " clear"],
    clickOnTheMapTo: "Click on the map to set the location.",
  },

  // ── Importing quests ──────────────────────────────────────────────────────
  questImportModal: {
    mFence: (p: { dataFenceRadius: unknown }) =>
      ` ${p.dataFenceRadius} m fence`,
    answer: (p: { answersLength: unknown; answersLength2: unknown }) =>
      ` · ${p.answersLength} answer${p.answersLength2}`,
    thatFileIsTooLarge: "That file is too large to be a quest export.",
    importQuests: "Import Quests",
    importedQuestsAreAddedTo: "Imported quests go to the end. Existing quests stay as they are.",
    chooseJsonFile: "Choose JSON file",
    inactive: "inactive",
    aQuestWithThisTitle: (p: { prepared: unknown }) =>
      `A quest with this title already exists. It will be imported as “${p.prepared}”.`,
    thisGameHasQuestsAnd: (p: { existingCount: unknown; maxQuestsPerGame: unknown; existingCount2: unknown }) =>
      `This game has ${p.existingCount} quests and a game may hold at most ${p.maxQuestsPerGame}. Untick ${p.existingCount2} more to continue.`,
    ofSelected: (p: { importableLength: unknown; entriesLength: unknown }) =>
      `${p.importableLength} of ${p.entriesLength} selected`,
    cannotBeImported: (p: { failedCount: unknown }) =>
      ` · ${p.failedCount} cannot be imported`,
    cancel: "Cancel",
    importing: "Importing…",
    importQuest: (p: { importableLength: unknown; importableLength2: unknown }) =>
      `Import ${p.importableLength} quest${p.importableLength2}`,
    thisGameIsAlreadyRunning: <T>(p: { span: T }) =>
      ["This game is already running. Imported quests are created ", p.span, " so they don't lengthen the race. Activate them when you're ready."],
  },

  // ── Quest triggers and tasks ──────────────────────────────────────────────
  questOptions: {
    location: "At a place",
    unlocksWhenTheTeamReaches: "Inside a fence around a place.",
    distance: "After a distance",
    unlocksAfterTheTeamHas: "After walking a set distance.",
    none: "Right away",
    unlockedRightAway: "As soon as the quest before is done.",
    answer: "Answer a question",
    playersTypeInAValid: "Teams type an answer.",
    timer: "Wait",
    countdownEGAMandatory: "A countdown, like a break.",
    continue: "Read and continue",
    infoOnlyPlayersReadIt: "Teams read it and tap Continue.",

  },

  // ── Importing quest files (messages about the file's contents) ─────────
  questExport: {
    // Where in the file a problem is, e.g. "description block 2" or "hint 1"
    block: (p: { field: unknown; n: unknown }) =>
      `${p.field} block ${p.n}`,
    hint: (p: { n: unknown }) =>
      `hint ${p.n}`,
    mustBeAListOf: (p: { field: unknown }) =>
      `${p.field} must be a list of blocks, or a plain string.`,
    isNotABlock: (p: { where: unknown }) =>
      `${p.where} is not a block.`,
    hasNoTextAndWas: (p: { where: unknown }) =>
      `${p.where} has no text and was dropped.`,
    needsAnImageUrlStarting: (p: { where: unknown }) =>
      `${p.where} needs an image url starting with http:// or https://.`,
    needsAYouTubeVideoId: (p: { where: unknown }) =>
      `${p.where} needs a YouTube video id or link.`,
    hasUnknownType: (p: { where: unknown; jsonStringify: unknown }) =>
      `${p.where} has unknown type ${p.jsonStringify}.`,
    quest: (p: { index: unknown }) =>
      `Quest ${p.index}`,
    notAQuestObject: "Not a quest object.",
    titleIsRequired: "title is required.",
    noTriggerGivenTreatedAs: "No trigger given; treated as 'location'.",
    triggerMustBeOneOf: (p: { triggersJoin: unknown }) =>
      `trigger must be one of ${p.triggersJoin}.`,
    noTaskGivenTreatedAs: "No task given; treated as 'answer'.",
    taskMustBeOneOf: (p: { tasksJoin: unknown }) =>
      `task must be one of ${p.tasksJoin}.`,
    descriptionIsRequired: "description is required.",
    navigationHintIsUnusedWithTrigger: "navigationHint is unused with trigger 'none' and was dropped.",
    navigationHintIsRequiredForA: "navigationHint is required for a location trigger.",
    locationNeedsAValidLat: "location needs a valid lat and lng.",
    noFenceRadiusGivenUsing50: "No fenceRadius given; using 50 m.",
    fenceRadiusMustBeAPositive: "fenceRadius must be a positive number.",
    distanceMetersMustBeAPositive: "distanceMeters must be a positive number.",
    answersNeedsAtLeastOne: "answers needs at least one entry.",
    durationSecondsMustBeAPositive: "durationSeconds must be a positive number.",
    thisIsNotAValid: "This is not a valid JSON file.",
    expectedAJsonObjectWith: "Expected a JSON object with a \"quests\" list.",
    unknownFormatExpected: (p: { jsonStringify: unknown; exportFormat: unknown }) =>
      `Unknown format ${p.jsonStringify}; expected "${p.exportFormat}".`,
    thisFileWasMadeBy: (p: { version: unknown }) =>
      `This file was made by a newer version of the admin console (version ${p.version}).`,
    expectedAQuestsList: "Expected a \"quests\" list.",
    thisFileContainsNoQuests: "This file contains no quests.",
    thisFileContainsQuestsAt: (p: { questsLength: unknown; maxQuestsPerGame: unknown }) =>
      `This file contains ${p.questsLength} quests; at most ${p.maxQuestsPerGame} can be imported.`,
  },

  // ── Teams page ────────────────────────────────────────────────────────────
  teamsPage: {
    teams: "Teams",
    newTeam: "New team",
    editTeam: "Edit team",
    edit: "Edit",
    dropPlayersHere: "Drop players here",
    teamIsFull: "Team is full",
    takeOff: "Take off the team",
    dragToMove: (p: { name: string }) => `Move ${p.name}`,
    withoutATeam: "Without a team",
    dragIntoATeam: "— drag into a team",
    everyoneHasATeam: "Everyone has a team.",
    deleteThisTeam: "Delete this team?",
    allMembersWillBeUnassigned: "Its players stay in the game, without a team.",
    addPlayerByEmail: "Their email address",
    addPlayer: "Add player",
    addPlayerHelp: "They need an account first.",
    name: "Name",
    eGTeamAlpha: "e.g. Team Alpha",
    color: "Color",
    deleteTeam: "Delete team",
    delete: "Delete",
    cancel: "Cancel",
    saving: "Saving…",
    saveTeam: "Save",
    noTeamsYetCreateThe: "No teams yet. Create the first one, or let players form their own when they join.",
  },

  // ── Adjusting a team’s coins ──────────────────────────────────────────────
  coinAdjustModal: {
    couldNotSaveThatAdjustment: "Could not save that adjustment. Try again.",
    adjustCoins: "Adjust coins",
    currentlyCoins: (p: { teamName: unknown; balance: unknown }) =>
      `${p.teamName} · currently ${p.balance} coins`,
    amount: "Amount",
    coins: (p: { mathMax: unknown }) =>
      `→ ${p.mathMax} coins`,
    useAMinusSignTo: "Use a minus sign to deduct.",
    thatWouldGoBelowZero: "The balance won't go below 0.",
    reason: "Reason",
    wonTheSideChallenge: "Won the side challenge",
    cancel: "Cancel",
    saving: "Saving…",
    save: "Save",
  },

  // ── Correcting a team’s progress ──────────────────────────────────────────
  teamProgressModal: {
    progress: (p: { teamName: unknown }) =>
      `${p.teamName} · progress`,
    ofQuestsCoins: <T>(p: { completedLength: T; questOrderLength: T; teamCoins: T; teamFinishedAt: T }) =>
      [p.completedLength, " of ", p.questOrderLength, " quests · ", p.teamCoins, " coins", p.teamFinishedAt],
    thisTeamIsMarkedAs: "This team is marked as finished.",
    reopenTheirRace: "Reopen their race",
    currentQuest: "Current quest",
    markSolvedAdvance: "Mark solved & advance",
    paysTheUsualCoinsAs: (p: { economyCoinsPerQuest: unknown }) =>
      `Pays the usual ${p.economyCoinsPerQuest} coins, as if the team had answered.`,
    jumpToAQuest: "Jump to a quest",
    solved: "solved",
    current: "current",
    moveHere: "Move here",
    markTeamAsFinished: "Mark team as finished",
    close: "Close",
    finished: " · finished",
  },

  // ── The shop: items, prices and flash sales ───────────────────────────────
  shop: {
    title: "Shop",
    onAnotherTeam: "used on another team",
    price: "Price (coins)",
    save: "Save",
    saving: "Saving…",
    saved: "Saved",
    zeroOrMore: "The price must be 0 or more.",
    atLeastOne: (p: { label: string }) => `${p.label} must be at least 1.`,
    upTo100: (p: { label: string }) => `${p.label} must be between 1 and 100.`,
    liveNote: "A new price applies from the next purchase.",
    saleNow: (p: { percent: number; until: string }) => `Flash sale: ${p.percent}% off until ${p.until}`,
    flashSale: "Flash sale",
    flashSaleHelp: "Announced to everyone; prices go back by themselves.",
    saleItems: "Items in the sale",
    saleRunning: (p: { items: string; percent: number; until: string }) => `Flash sale: ${p.items} at ${p.percent}% off until ${p.until}`,
    flashSaleNothing: "Switch an item on to put it on sale.",
    discount: "Discount (%)",
    minutes: "For (minutes)",
    startSale: "Start the sale",
    endSale: "End it now",
  },


  // ── Item settings (on the Items page) ────────────────────────────────────
  itemSettings: {
    lasts: "Lasts (minutes)",
    shareTaken: "Share taken (%)",
    atMost: "At most (coins)",
    cooldown: "Cooldown (minutes)",
  },

  // ── Live map ──────────────────────────────────────────────────────────────
  liveMapPage: {
    liveMap: "Live map",
    teamPage: "Team page →",
    tapATeam: "Tap a team to follow its trail.",
    teamsN: (p: { n: unknown }) => `Teams (${p.n})`,
    show: "Show",
    hide: "Hide",
    streets: "Streets",
    satellite: "Satellite",
    last30Min: "Last 30 min",
    wholeRace: "Whole race",
    allTeams: "All teams",
    follow: "Follow",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    questN: (p: { n: unknown }) => `Quest ${p.n}`,
    atTheSpot: "At the spot",
    onTheWay: "On the way",
    finished: "Finished",
    noPosition: "No position yet",
    noPlayers: "No players in this team yet",
    justNow: "just now",
    minAgo: (p: { n: number }) => `${p.n} min ago`,
    hAgo: (p: { n: number }) => `${p.n}h ago`,
    fenceM: (p: { m: number }) => `Fence: ${p.m} m`,
  },

  // ── Activity page ─────────────────────────────────────────────────────────
  activityPage: {
    activity: "Activity",
    postANote: "Post a note",
    bonusChallengeAtTheFountain: "Bonus challenge at the fountain, 15:00",
    posting: "Posting…",
    post: "Post",
    alsoPush: "Also send as a push notification",
    allTeams: "All teams",
    nothingHasHappenedYet: "Nothing has happened yet.",
    private: "private",
    onlyThisTeamCanSee: "Only this team can see this entry",
    hostsOnly: "hosts only",
    onlyHostsCanSee: "Players don't see this",
  },

  // ── Chat page ─────────────────────────────────────────────────────────────
  chatPage: {
    allTeams: "← All teams",
    aTeam: "A team",
    chat: "Chat",
    enableDesktopNotifications: "Enable desktop notifications",
    noTeamsYet: "No teams yet.",
    you: "You: ",
    noMessagesYet: "No messages yet",
    pickATeamToRead: "Pick a team to read their thread.",
    nothingYetSayHello: "Nothing yet. Say hello.",
    seen: "Seen",
    replyTo: (p: { openTeamName: unknown }) =>
      `Reply to ${p.openTeamName}…`,
    sending: "Sending…",
    send: "Send",
  },

  // ── Users page (platform admins) ──────────────────────────────────────────
  usersPage: {
    users: "Users",
    onlyAdmins: "The user list is available to platform admins only.",
    noUsersYet: "No users yet.",
    admin: "Admin",
    you: "You",
    hosts: "Hosts",
    plays: "Plays in",
    search: "Search by name or email",
    noMatch: "Nobody matches.",
    delete: "Delete",
    deleteTitle: (p: { name: string }) => `Delete ${p.name}'s account?`,
    deleteBody: "Everything of theirs, in every game. Their team's progress stays. This can't be undone.",
    deleteForGood: "Delete for good",
    makeAdmin: "Make admin",
    removeAdmin: "Remove admin",
    makeAdminTitle: (p: { name: string }) => `Make ${p.name} an admin?`,
    makeAdminBody: "Admins can run every game and delete accounts.",
    removeAdminTitle: (p: { name: string }) => `Remove ${p.name} as an admin?`,
    removeAdminBody: "They keep their own games.",
  },

  // ── api ───────────────────────────────────────────────────────────────────
  api: {
    signInFirst: "Sign in first",
    somethingWentWrongTryAgain: "Something went wrong. Try again.",
  },

  // ── contentBlocks ─────────────────────────────────────────────────────────
  contentBlocks: {
    imageURLsMustStartWith: "A picture's address starts with https://.",
    imageOnComputer: "That's a file on your computer. Upload it instead.",
    oneOfTheYouTubeLinks: "One of the YouTube links is not recognized.",
  },
};

export type ConsoleCopy = typeof consoleEn;
