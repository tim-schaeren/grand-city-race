import { consoleCopy as cc } from '@grandcityrace/shared';
export const TRIGGER_OPTIONS = [
  { value: 'location', label: cc.questOptions.location, help: cc.questOptions.unlocksWhenTheTeamReaches },
  { value: 'distance', label: cc.questOptions.distance, help: cc.questOptions.unlocksAfterTheTeamHas },
  { value: 'none', label: cc.questOptions.none, help: cc.questOptions.unlockedRightAway },
];

export const TASK_OPTIONS = [
  { value: 'answer', label: cc.questOptions.answer, help: cc.questOptions.playersTypeInAValid },
  { value: 'timer', label: cc.questOptions.timer, help: cc.questOptions.countdownEGAMandatory },
  { value: 'continue', label: cc.questOptions.continue, help: cc.questOptions.infoOnlyPlayersReadIt },
];
