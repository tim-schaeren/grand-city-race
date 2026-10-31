import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { consoleCopy as cc, SHOP_ITEMS_BY_TYPE, THEME_LIST, type ShopItemType } from '@grandcityrace/shared';
import Icon from '../components/Icon';
import { Logo } from '../ui/Logo';
import hint from './shots/hint.webp';
import quest from './shots/quest.webp';
import board from './shots/board.webp';
import editor from './shots/console-quest.webp';
import liveMap from './shots/console-map.webp';
import './landing.css';

const c = cc.landing;

// The stores' pages for the app. Until Apple has approved it, the page says
// it's coming instead of linking to a store page that doesn't open yet.
const STORES_LIVE = false;
const APP_STORE = 'https://apps.apple.com/app/id6760836695';
const GOOGLE_PLAY = 'https://play.google.com/store/apps/details?id=com.gcrace.app';

const ITEMS: ShopItemType[] = ['compass', 'radar', 'shield', 'curse', 'robbery', 'donate'];
const MEAN: ShopItemType[] = ['curse', 'robbery'];

// What someone sees at grand-city-race.com before signing in: what the game
// is, for players and for hosts, and where to start
export default function LandingPage() {
  const root = useReveal();
  const [motion, setMotion] = useMotion();
  return (
    <div className={`lp${motion ? '' : ' lp-still'}`} ref={root}>
      <header className="lp-bar">
        <div className="lp-wrap">
          <Brand />
          <div className="lp-bar-actions">
            <button type="button" role="switch" aria-checked={motion} className="lp-motion" onClick={() => setMotion(!motion)}>
              <span className="lp-motion-track" aria-hidden />
              {c.motion}
            </button>
            <Link to="/login" className="lp-button lp-button-light lp-button-small">{c.signIn}</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-burst" aria-hidden />
          <div className="lp-wrap lp-hero-text">
            <div>
              <span className="lp-eyebrow">{c.eyebrow}</span>
              <h1 className="lp-display lp-headline">{c.headline.map(line => <span key={line}>{line}</span>)}</h1>
              <p className="lp-intro">{c.intro}</p>
              <div className="lp-ctas">
                <Link to="/login?mode=signup" className="lp-button lp-button-dark">{c.host} <Icon name="arrow-right" size={20} /></Link>
                <a href="#download" className="lp-button lp-button-light">{c.getApp}</a>
              </div>
              <p className="lp-small">{c.smallPrint}</p>
            </div>
          </div>
        </section>

        <Ticker />

        <section className="lp-section">
          <div className="lp-wrap">
            <Head title={c.playTitle} />
            <ol className="lp-steps">
              {c.steps.map((step, i) => (
                <li key={step.title} className="lp-step lp-reveal">
                  <Phone src={[hint, quest, board][i]} alt={[c.shotAlt.hint, c.shotAlt.quest, c.shotAlt.board][i]} />
                  <span className="lp-step-number">{i + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="lp-section lp-dark">
          <div className="lp-wrap">
            <Head title={c.itemsTitle}>{c.itemsIntro}</Head>
            <ul className="lp-items">
              {ITEMS.map(type => (
                <li key={type} className="lp-item lp-reveal" data-mean={MEAN.includes(type) || undefined}>
                  <span className="lp-item-icon"><Icon name={SHOP_ITEMS_BY_TYPE[type].icon} size={30} /></span>
                  <h3>{SHOP_ITEMS_BY_TYPE[type].name}</h3>
                  <p>{c.items[type]}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="lp-section lp-host">
          <div className="lp-wrap lp-host-grid">
            <div className="lp-reveal">
              <h2 className="lp-display lp-title">{c.hostTitle}</h2>
              <p className="lp-intro" style={{ marginTop: 18 }}>{c.hostIntro}</p>
              <ul className="lp-points">
                {c.hostPoints.map((point, i) => (
                  <li key={point.title} className="lp-point">
                    <b>{i + 1}</b>
                    <div><h3>{point.title}</h3><p>{point.text}</p></div>
                  </li>
                ))}
              </ul>
              <Link to="/login?mode=signup" className="lp-button lp-button-dark">{c.hostCta} <Icon name="arrow-right" size={20} /></Link>
            </div>
            <div className="lp-screens lp-reveal">
              <div className="lp-browser"><img src={liveMap} alt={c.shotAlt.map} loading="lazy" /></div>
              <div className="lp-browser"><img src={editor} alt={c.shotAlt.editor} loading="lazy" /></div>
            </div>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-wrap">
            <Head title={c.themesTitle}>{c.themesIntro}</Head>
            <ul className="lp-themes">
              {THEME_LIST.map(theme => (
                <li key={theme.id} className="lp-theme lp-reveal">
                  <div className="lp-theme-phone" style={{ background: theme.colors.background, color: theme.colors.text }}>
                    <small>{c.themeQuest}</small>
                    <strong style={{ color: theme.colors.heading, fontFamily: theme.fonts.display ?? 'system-ui', fontSize: `${1.5 * theme.fonts.scale}rem` }}>
                      {c.themeSample}
                    </strong>
                    <span style={{ background: theme.colors.surface, border: `2px solid ${theme.colors.border}` }} />
                    <i style={{ background: theme.colors.accent }} />
                  </div>
                  <h3>{theme.name}</h3>
                  <p>{theme.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="lp-download" id="download">
          <div className="lp-burst" aria-hidden />
          <div className="lp-wrap lp-download-inner lp-reveal">
            <h2 className="lp-display lp-headline">{c.downloadTitle.map(line => <span key={line}>{line}</span>)}</h2>
            <p className="lp-intro" style={{ margin: '0 auto' }}>{c.downloadText}</p>
            {STORES_LIVE ? (
              <div className="lp-stores">
                <a href={APP_STORE} className="lp-button lp-button-dark lp-store"><small>{c.downloadOn}</small><strong>{c.appStore}</strong></a>
                <a href={GOOGLE_PLAY} className="lp-button lp-button-dark lp-store"><small>{c.getItOn}</small><strong>{c.googlePlay}</strong></a>
              </div>
            ) : (
              <p className="lp-soon">{c.comingSoon}</p>
            )}
            <div className="lp-ctas" style={{ justifyContent: 'center' }}>
              <Link to="/login?mode=signup" className="lp-button lp-button-light">{c.host} <Icon name="arrow-right" size={20} /></Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap">
          <Brand />
          <nav>
            <Link to="/help">{c.footer.players}</Link>
            <Link to="/help/hosting">{c.footer.hosts}</Link>
            <Link to="/support">{c.footer.support}</Link>
            <Link to="/privacy">{c.footer.privacy}</Link>
            <Link to="/terms">{c.footer.terms}</Link>
            <Link to="/guidelines">{c.footer.guidelines}</Link>
            <Link to="/login">{c.signIn}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Brand() {
  return (
    <Link to="/" className="lp-brand">
      <span className="lp-brand-mark"><Logo size={26} title={cc.shell.brand} /></span>
      <span className="lp-brand-name">{cc.shell.brand}</span>
    </Link>
  );
}

function Phone({ src, alt }: { src: string; alt: string }) {
  return <div className="lp-phone"><img src={src} alt={alt} loading="lazy" /></div>;
}

function Head({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="lp-section-head lp-reveal">
      <h2 className="lp-display lp-title">{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}

// A race's feed going by, twice over so the loop has no seam
function Ticker() {
  const lines = [...c.ticker, ...c.ticker];
  return (
    <div className="lp-ticker" aria-hidden>
      <div className="lp-ticker-track">{lines.map((line, i) => <span key={i}>{line}</span>)}</div>
    </div>
  );
}

// Whether the page moves: the sunburst turning, the ticker running, things
// sliding in. Off from the start for people whose device asks for less
// motion; either way the visitor's choice is remembered in this browser.
const MOTION_KEY = 'gcr-landing-motion';

function useMotion(): [boolean, (on: boolean) => void] {
  const [motion, setMotion] = useState(() => {
    try {
      const saved = localStorage.getItem(MOTION_KEY);
      if (saved === 'on' || saved === 'off') return saved === 'on';
    } catch {
      // No storage: fall back to the device's setting
    }
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  function choose(on: boolean) {
    setMotion(on);
    try {
      localStorage.setItem(MOTION_KEY, on ? 'on' : 'off');
    } catch {
      // Without storage the choice lasts until the page reloads
    }
  }
  return [motion, choose];
}

// Marks what's scrolled into view, so it slides in once
function useReveal() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const items = root.current?.querySelectorAll('.lp-reveal') ?? [];
    if (!('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('lp-in'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('lp-in');
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -10% 0px' });
    items.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return root;
}
