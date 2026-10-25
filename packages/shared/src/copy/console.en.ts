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
  // ── Sidebar, game switcher and first-run screen ───────────────────────────
  layout: {
    unendedRace: (p: { started: string; deletion: string }) =>
      `This race started on ${p.started} and was never ended. Its location trails will be deleted on ${p.deletion}.`,
    selectGame: "Select game",
    noGamesYet: "No games yet",
    editGame: "Edit game",
    newGame: "+ New game",
    game: "Game",
    quests: "Quests",
    teams: "Teams",
    items: "Items",
    leaderboard: "Leaderboard",
    liveMap: "Live Map",
    activity: "Activity",
    chat: <T>(p: { chatUnread: T }) =>
      ["Chat", p.chatUnread],
    users: "Users",
    hostingGuide: "Hosting guide",
    signOut: "Sign out",
    gcrAdmin: "GCR Admin",
    welcomeToGrandCityRace: "Welcome to Grand City Race",
    createAGameAddSome: "Create a game, add some quests, and share its invite code with your players. They join from the app with that code.",
    createYourFirstGame: "Create your first game",
  },

  // ── Sign in and sign up ───────────────────────────────────────────────────
  loginPage: {
    thatEmailAddressDoesnT: "That email address doesn’t look right.",
    enterYourName: "Enter your name.",
    pickAPasswordWithAt: (p: { minPasswordLength: unknown }) =>
      `Pick a password with at least ${p.minPasswordLength} characters.`,
    pleaseAcceptTheTermsTo: "Please accept the terms to continue.",
    gcr: "GCR",
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
    game: "Game",
    scheduledStart: (p: { formatDateTime: unknown }) =>
      `Scheduled start: ${p.formatDateTime}`,
    totalPaused: (p: { formatDuration: unknown }) =>
      `Total paused: ${p.formatDuration}`,
    pausedAt: (p: { formatDateTime: unknown }) =>
      `Paused at ${p.formatDateTime}`,
    endedAt: (p: { formatDateTime: unknown }) =>
      `Ended at ${p.formatDateTime}`,
    startNow: "Start now",
    pauseGame: "Pause game",
    resumeGame: "Resume game",
    // The word a host types to confirm ending the game
    end: "END",
    typeEnd: (p: { word: unknown }) => `Type ${p.word}`,
    endGame: "End game",
    cancel: "Cancel",
    // The word a host types to confirm resetting the game
    reset: "RESET",
    typeReset: (p: { word: unknown }) => `Type ${p.word}`,
    resetGame: "Reset game",
    thisWillEndTheGame: <T>(p: { span: T }) =>
      ["This will end the game for all players and notify them. Type ", p.span, " to confirm."],
    thisSendsEveryTeamBack: <T>(p: { span: T }) =>
      ["This sends every team back to the start and clears everything the race left behind: progress, coins, the activity feed, chat, wrong answers, and positions and trails on the live map, and the recap. Teams and players stay. Type ", p.span, " to confirm."],
  },

  // ── Creating and editing a game ───────────────────────────────────────────
  gameForm: {
    timeZone: "Time zone",
    timeZoneHelp: "The start time is by this clock, usually the race's city. Players' countdowns are right wherever they are.",
    quest3Of8: "Quest 3 of 8",
    theOldFountain: "The old fountain",
    continue: "Continue",
    nameIsRequired: "Name is required.",
    startDateAndTimeAre: "Start date and time are required.",
    cityIsRequired: "City is required.",
    startingCoins: "Starting coins",
    coinsPerQuest: "Coins per quest",
    hintCost: "Hint cost",
    mustBe0OrMore: (p: { label: unknown }) =>
      `${p.label} must be 0 or more.`,
    couldNotFindThisCity: "Could not find this city. Check the spelling.",
    editGame: "Edit Game",
    newGame: "New Game",
    deleteThisGame: "Delete this game?",
    thisWillPermanentlyDeleteAnd: <T>(p: { span: T }) =>
      ["This will permanently delete", " ", p.span, " and all its quests. This cannot be undone."],
    typeToConfirm: <T>(p: { span: T }) =>
      ["Type ", p.span, " to confirm:"],
    name: "Name",
    eGGrandCityRace: "e.g. Grand City Race 2026",
    startDateTime: "Start date & time",
    city: "City",
    eGZurich: "e.g. Zurich",
    usedAsTheDefaultMap: "Used as the default map location when adding quests.",
    maxTeamSize: "Max team size",
    noLimit: "No limit",
    leaveBlankForNoLimit: "Leave blank for no limit.",
    maxTeamSpreadMeters: "Max team spread (meters)",
    maxDistanceBetweenTeamMembers: "Max distance between team members. Leave blank for no limit.",
    hotlineNumber: "Hotline number",
    shownToPlayersAsCall: "Shown to players as “Call the hosts\". Leave blank to hide it.",
    look: "Look",
    howTheGameLooksOn: "How the game looks on players' phones.",
    coins: "Coins",
    teamsSpendCoinsToReveal: "Teams spend coins to reveal hints.",
    startingCoins2: "startingCoins",
    starting: "Starting",
    coinsPerQuest2: "coinsPerQuest",
    perQuest: "Per quest",
    hintCost2: "hintCost",
    perHint: "Per hint",
    back: "← Back",
    deleteGame: "Delete game",
    delete: "Delete",
    cancel: "Cancel",
    saving: "Saving…",
    saveGame: "Save Game",
  },

  // ── Hosts (on the Game page) ──────────────────────────────────────────────
  hostsPanel: {
    you: "You",
    aHost: "A host",
    hosts: "Hosts",
    hostsRunThisGameQuests: "Hosts run this game: quests, teams, coins and the activity board. Add a co-host by the email they signed up with.",
    noHostsYetOnlyPlatform: "No hosts yet — only platform admins can run this game.",
    you2: " (you)",
    remove: "Remove",
    cohostExampleCom: "cohost@example.com",
    addHost: "Add host",
    addMeAsHost: "+ Add me as host",
  },

  // ── Invite code (on the Game page) ────────────────────────────────────────
  joinCodePanel: {
    inviteCode: "Invite code",
    playersEnterThisInThe: "Players enter this in the app to join this game.",
    copied: "Copied",
    copy: "Copy",
    aNewCodeStopsThe: "A new code stops the old one working. Players who already joined stay in — only people still trying to join would need the new one.",
    working: "Working…",
    yesNewCode: "Yes, new code",
    cancel: "Cancel",
    generateANewCode: "Generate a new code",
    generateInviteCode: "Generate invite code",
  },

  // ── Recap (on the Game page) ──────────────────────────────────────────────
  recapPanel: {
    recap: "Recap",
    description: "A look back at the race: a replay of every team's route, places over time, awards, and what each team bought. Build it, have a look, then show it to the players when you're ready.",
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
    active: "Active",
    inactive: "Inactive",
    deactivate: "Deactivate",
    activate: "Activate",
    map: "Map →",
    youHaveUnsavedChangesDiscard: "You have unsaved changes. Discard them?",
    quests: "Quests",
    export: "Export",
    import: "Import",
    newQuest: "+ New Quest",
    thisGameHasReachedThe: (p: { maxQuestsPerGame: unknown }) =>
      `This game has reached the limit of ${p.maxQuestsPerGame} quests. Delete one to add another.`,
    noQuestsYetCreateThe: "No quests yet. Create the first one.",
    aGameMayHoldAt: (p: { maxQuestsPerGame: unknown }) =>
      `A game may hold at most ${p.maxQuestsPerGame} quests.`,
  },

  // ── Writing a quest ───────────────────────────────────────────────────────
  questForm: {
    // Placeholders in the text editors, by task and by trigger
    descriptionAnswer: "What must players do to complete this quest?",
    descriptionTimer: "Shown during the countdown (e.g. \"Lunch break — enjoy!\")",
    descriptionContinue: "Information for the players",
    navigationLocation: "How do players find this quest? (e.g. 'Find the oldest tree in the city')",
    navigationDistance: "Shown while walking (e.g. 'Head towards the lake')",
    hintPlaceholder: (p: { n: unknown }) =>
      `Hint ${p.n}`,
    titleIsRequired: "Title is required.",
    aQuestWithThisTitle: "A quest with this title already exists.",
    descriptionIsRequired: "Description is required.",
    navigationHintIsRequired: "Navigation hint is required.",
    fenceRadiusMustBeA: "Fence radius must be a positive number.",
    aValidLocationIsRequired: "A valid location is required.",
    distanceMustBeAPositive: "Distance must be a positive number.",
    atLeastOneAnswerIs: "At least one answer is required.",
    durationMustBeAPositive: "Duration must be a positive number.",
    editQuest: "Edit Quest",
    newQuest: "New Quest",
    deleteThisQuest: "Delete this quest?",
    thisWillPermanentlyDeleteThis: <T>(p: { span: T }) =>
      ["This will permanently delete", " ", p.span, ". This cannot be undone."],
    typeToConfirm: <T>(p: { span: T }) =>
      ["Type ", p.span, " to confirm:"],
    title: "Title",
    questTitle: "Quest title",
    trigger: "Trigger",
    task: "Task",
    description: "Description",
    navigationHint: <T>(p: { formTrigger: T }) =>
      ["Navigation Hint", p.formTrigger],
    fenceRadiusMeters: "Fence Radius (meters)",
    location: "Location",
    distanceMeters: "Distance (meters)",
    measuredByGpsFromWhen: "Measured by GPS from when the team starts this quest.",
    showProgress: "Show progress",
    offHidesTheBarAnd: "Off hides the bar and the meters walked, so teams don't know how far they've come.",
    durationMinutes: "Duration (minutes)",
    gamePausesDonTCount: "Game pauses don't count toward the timer.",
    validAnswers: "Valid Answers",
    answer: (p: { i: unknown }) =>
      `Answer ${p.i}`,
    addAnswer: "+ Add answer",
    rejectedAnswers: <T>(p: { span: T }) =>
      ["Rejected answers", " ", p.span],
    acceptToAddAsValid: "Accept to add as valid answers. Save to apply.",
    accepted: "accepted",
    accept: "Accept",
    optional: "(optional)",
    teamsPayCoinsToReveal: "Teams pay coins to reveal these, one at a time. Each hint can hold text, pictures and videos.",
    hint: (p: { i: unknown }) =>
      `Hint ${p.i}`,
    addHint: "+ Add hint",
    active: "Active",
    back: "← Back",
    deleteQuest: "Delete quest",
    delete: "Delete",
    cancel: "Cancel",
    saving: "Saving…",
    saveQuest: "Save Quest",
    hints: <T>(p: { span: T }) =>
      ["Hints", " ", p.span],
  },

  // ── Text, picture and video blocks in a quest ─────────────────────────────
  contentBlocksEditor: {
    imageCouldNotBeLoaded: "Image could not be loaded.",
    text: "Text",
    image: "Image",
    youTube: "YouTube",
    remove: "Remove",
    httpsDirectLinkToA: "https://… (direct link to a .jpg / .png)",
    captionOptional: "Caption (optional)",
    httpsWwwYoutubeComWatch: "https://www.youtube.com/watch?v=…",
    youTubePreview: "YouTube preview",
    text2: "text",
    text3: "+ Text",
    image2: "image",
    image3: "+ Image",
    youtube: "youtube",
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
    importedQuestsAreAddedTo: "Imported quests are added to the end of this game. Existing quests are never changed or deleted.",
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
    location: "Location",
    unlocksWhenTheTeamReaches: "Unlocks when the team reaches a place.",
    distance: "Distance",
    unlocksAfterTheTeamHas: "Unlocks after the team has moved a set distance.",
    none: "None",
    unlockedRightAway: "Unlocked right away.",
    answer: "Answer",
    playersTypeInAValid: "Players type in a valid answer.",
    timer: "Timer",
    countdownEGAMandatory: "Countdown, e.g. a mandatory break. Starts once unlocked.",
    continue: "Continue",
    infoOnlyPlayersReadIt: "Info only — players read it and tap continue.",
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
    translate3dPxPx0: (p: { transformX: unknown; transformY: unknown }) =>
      `translate3d(${p.transformX}px, ${p.transformY}px, 0)`,
    adjustCoins: "Adjust coins",
    progress: "Progress",
    map: "Map →",
    edit: "Edit",
    dropPlayersHere: "Drop players here",
    teamIsFull: "Team is full",
    editTeam: "Edit Team",
    newTeam: "New Team",
    deleteThisTeam: "Delete this team?",
    allMembersWillBeUnassigned: "All members will be unassigned. This cannot be undone.",
    addPlayerByEmail: "Their email address",
    addPlayer: "Add player",
    addPlayerHelp: "Players join with the invite code. To add someone yourself, they need an account first.",
    typeToConfirm: <T>(p: { span: T }) =>
      ["Type ", p.span, " to confirm:"],
    name: "Name",
    eGTeamAlpha: "e.g. Team Alpha",
    color: "Color",
    customColor: "Custom color",
    back: "← Back",
    deleteTeam: "Delete team",
    delete: "Delete",
    cancel: "Cancel",
    saving: "Saving…",
    saveTeam: "Save Team",
    t0003px111: "0 0 0 3px #111",
    teams: "Teams",
    newTeam2: "+ New Team",
    noTeamsYetCreateThe: "No teams yet. Create the first one.",
    unassignedPlayers: <T>(p: { teamsLength: T }) =>
      ["Unassigned Players", p.teamsLength],
    dragIntoATeam: "— drag into a team",
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
    thatWouldGoBelowZero: "That would go below zero; the balance will be set to 0.",
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

  // ── Items page ────────────────────────────────────────────────────────────
  itemsPage: {
    mustBeAtLeast1: "must be at least 1 minute",
    mustBeBetween1And: "must be between 1 and 100",
    mustBeAtLeast12: "must be at least 1",
    priceMustBe0Or: "Price must be 0 or more.",
    usedOnAnotherTeam: "used on another team",
    onSale: "On sale",
    hiddenFromTeams: "Hidden from teams",
    price: "price",
    priceCoins: "Price (coins)",
    saving: "Saving…",
    save: "Save",
    saved: "Saved",
    items: "Items",
    whatTeamsCanBuyWith: "What teams can buy with their coins. Switching an item off hides it from the shop. Items used on another team are announced to everyone in the activity feed.",
  },

  // ── Item settings (on the Items page) ────────────────────────────────────
  itemSettings: {
    lasts: "Lasts (minutes)",
    shareTaken: "Share taken (%)",
    atMost: "At most (coins)",
    cooldown: "Cooldown (minutes)",
  },

  // ── Leaderboard ───────────────────────────────────────────────────────────
  leaderboardPage: {
    leaderboard: "Leaderboard",
    noTeamsYet: "No teams yet.",
    quests: <T>(p: { span: T; completed: T; totalQuests: T; teamFinishedAt: T }) =>
      [p.span, p.completed, " / ", p.totalQuests, " quests", p.teamFinishedAt],
    stuckWrongAnswersOnThis: (p: { wrongTries: unknown }) =>
      `Stuck · ${p.wrongTries} wrong answers on this quest`,
    solving: "Solving",
    lookingFor: "Looking for",
    coinsHintsRevealed: "Coins · hints revealed",
  },

  // ── Live map ──────────────────────────────────────────────────────────────
  liveMapPage: {
    liveMap: "Live map",
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
    minAgo: (p: { mathFloor: unknown }) =>
      `${p.mathFloor} min ago`,
    hAgo: (p: { mathFloor: unknown }) =>
      `${p.mathFloor}h ago`,
    fenceM: (p: { questFenceRadius: unknown }) =>
      `Fence: ${p.questFenceRadius} m`,
    unknown: "unknown",
  },

  // ── Activity page ─────────────────────────────────────────────────────────
  activityPage: {
    activity: "Activity",
    postANote: "Post a note",
    bonusChallengeAtTheFountain: "Bonus challenge at the fountain, 15:00",
    posting: "Posting…",
    post: "Post",
    alsoSendAsAPush: <T>(p: { input: T }) =>
      [p.input, "Also send as a push notification to every player"],
    all: "all",
    allTeams: "All teams",
    nothingHasHappenedYet: "Nothing has happened yet.",
    private: "private",
    onlyThisTeamCanSee: "Only this team can see this entry",
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
    hostOf: (p: { games: unknown }) => `Host of ${p.games}`,
    unassigned: "Unassigned",
    delete: "Delete",
    deleteConfirm: (p: { name: unknown }) =>
      `Delete ${p.name} for good? Their account, profile, location history and chat messages go, in every game they were in. Their team's progress stays. This can't be undone.`,
    deleteForGood: "Delete for good",
    deleting: "Deleting…",
    cancel: "Cancel",
    makeAdmin: "Make admin",
    removeAdmin: "Remove admin",
  },

  // ── api ───────────────────────────────────────────────────────────────────
  api: {
    signInFirst: "Sign in first",
    somethingWentWrongTryAgain: "Something went wrong. Try again.",
  },

  // ── contentBlocks ─────────────────────────────────────────────────────────
  contentBlocks: {
    imageURLsMustStartWith: "Image URLs must start with http:// or https://.",
    oneOfTheYouTubeLinks: "One of the YouTube links is not recognized.",
  },
};

export type ConsoleCopy = typeof consoleEn;
