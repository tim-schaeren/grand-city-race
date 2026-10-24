import {
  mdiCheckCircleOutline,
  mdiTrophyOutline,
  mdiLightbulbOutline,
  mdiCompassOutline,
  mdiCircleMultipleOutline,
  mdiFlagOutline,
  mdiPauseCircleOutline,
  mdiPlayCircleOutline,
  mdiFlagCheckered,
  mdiBullhornOutline,
  mdiWrenchOutline,
  mdiCircleSmall,
  mdiLockOutline,
  mdiPhoneOutline,
  mdiMapMarkerOutline,
  mdiBellOutline,
  mdiPartyPopper,
  mdiMenu,
  mdiClose,
  mdiArrowRight,
  mdiNavigation,
  mdiOpenInNew,
  mdiCheck,
  mdiChatOutline,
  mdiAccountOutline,
  mdiEggOutline,
  mdiRadar,
  mdiShieldOutline,
  mdiShieldCheckOutline,
  mdiSkullOutline,
  mdiSackPercent,
  mdiHandCoinOutline,
  mdiPencilOutline,
  mdiPlus,
  mdiMinus,
  mdiSwordCross,
} from '@mdi/js';

// The same Material Design Icons the player app draws, by name. Only the ones
// in use are imported, so the bundle doesn't carry the whole set.
const PATHS = {
  'check-circle-outline': mdiCheckCircleOutline,
  'trophy-outline': mdiTrophyOutline,
  'lightbulb-outline': mdiLightbulbOutline,
  'compass-outline': mdiCompassOutline,
  'circle-multiple-outline': mdiCircleMultipleOutline,
  'flag-outline': mdiFlagOutline,
  'pause-circle-outline': mdiPauseCircleOutline,
  'play-circle-outline': mdiPlayCircleOutline,
  'flag-checkered': mdiFlagCheckered,
  'bullhorn-outline': mdiBullhornOutline,
  'wrench-outline': mdiWrenchOutline,
  'circle-small': mdiCircleSmall,
  'lock-outline': mdiLockOutline,
  'phone-outline': mdiPhoneOutline,
  'map-marker-outline': mdiMapMarkerOutline,
  'bell-outline': mdiBellOutline,
  'party-popper': mdiPartyPopper,
  'menu': mdiMenu,
  'close': mdiClose,
  'arrow-right': mdiArrowRight,
  'navigation': mdiNavigation,
  'open-in-new': mdiOpenInNew,
  'check': mdiCheck,
  'chat-outline': mdiChatOutline,
  'account-outline': mdiAccountOutline,
  'egg-outline': mdiEggOutline,
  'radar': mdiRadar,
  'shield-outline': mdiShieldOutline,
  'shield-check-outline': mdiShieldCheckOutline,
  'skull-outline': mdiSkullOutline,
  'sack-percent': mdiSackPercent,
  'hand-coin-outline': mdiHandCoinOutline,
  'pencil-outline': mdiPencilOutline,
  'plus': mdiPlus,
  'minus': mdiMinus,
  'sword-cross': mdiSwordCross,
};

// The bare path, for drawing an icon outside React (map markers)
export const iconPath = name => PATHS[name] ?? PATHS['circle-small'];

export default function Icon({ name, size = 16, className = '', title }) {
  const path = iconPath(name);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={`inline-block shrink-0 ${className}`}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      <path d={path} />
    </svg>
  );
}
