import LegalLayout, { H2, UL } from './LegalLayout';

const EMAIL = 'paddock-cliques5u@icloud.com';

function Mail({ subject }) {
  const href = `mailto:${EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
  return <a className="underline" href={href}>{EMAIL}</a>;
}

// The support URL in both store listings, and the account deletion link Google
// Play requires: a page that works without the app installed.
export default function SupportPage() {
  return (
    <LegalLayout title="Support" updated="18 October 2026">
      <p>
        Grand City Race is a scavenger hunt you play with friends. A host sets up a
        race on this website; players join it in the app with an invite code.
      </p>

      <H2>During a race</H2>
      <UL>
        <li>Your hosts are the quickest help: message them from the chat in the app,
          or tap <strong>Call the hosts</strong> if they left a number.</li>
        <li>A quest won't unlock? Quests can need your team at a place, or to have
          walked far enough. Check that the app is allowed to use your location.</li>
        <li>No notifications? Allow them for Grand City Race in your phone's settings.</li>
        <li>The app asks you to update? Your version is too old for the game. Update it
          from the App Store or Google Play and open it again.</li>
      </UL>

      <H2>Hosting a race</H2>
      <p>
        Create an account and your first game on{' '}
        <a className="underline" href="/login">this website</a>, add quests, and share
        the invite code. Hosts never need the app.
      </p>

      <H2 id="delete-account">Deleting your account</H2>
      <p>
        In the app, open your profile (the round button with your initial) and choose{' '}
        <strong>Delete account</strong>. If you can't get into the app any more, email{' '}
        <Mail subject="Delete my Grand City Race account" /> from the address you signed
        up with, and we will delete it within 30 days.
      </p>
      <p>
        Deleting removes your profile, your location history and the messages you sent.
        Your team's progress stays, because the rest of your team is still using it; it
        no longer identifies you. Nothing else is kept.
      </p>

      <H2>Reporting a problem or abuse</H2>
      <p>
        Tell the host of your game first — they can remove players and fix things
        immediately. For anything else, or anything about a host, email <Mail />. We
        read every report and can remove games and suspend accounts. See the{' '}
        <a className="underline" href="/guidelines">community guidelines</a>.
      </p>

      <H2>Contact</H2>
      <p>
        <Mail />
      </p>
    </LegalLayout>
  );
}
