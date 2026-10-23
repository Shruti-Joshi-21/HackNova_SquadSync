"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import "./landing.css";

// Class names: plain CSS with an ssl- prefix. (next.config sends every .css file
// through Tailwind as global CSS, so CSS modules are not available here.)
const s = {
  root: "ssl-root",
  grain: "ssl-grain",
  heroPhoto: "ssl-heroPhoto",
  page: "ssl-page",
  menuBackdrop: "ssl-menuBackdrop",
  header: "ssl-header",
  logo: "ssl-logo",
  logoMark: "ssl-logoMark",
  logoSuffix: "ssl-logoSuffix",
  nav: "ssl-nav",
  navLink: "ssl-navLink",
  headerRight: "ssl-headerRight",
  burger: "ssl-burger",
  burgerBar: "ssl-burgerBar",
  menuOpen: "ssl-menuOpen",
  btn: "ssl-btn",
  btnSolid: "ssl-btnSolid",
  btnGhost: "ssl-btnGhost",
  heroActions: "ssl-heroActions",
  hero: "ssl-hero",
  heroCopy: "ssl-heroCopy",
  badge: "ssl-badge",
  badgeStar: "ssl-badgeStar",
  h1: "ssl-h1",
  headlineLine: "ssl-headlineLine",
  headlineText: "ssl-headlineText",
  lede: "ssl-lede",
  stats: "ssl-stats",
  stat: "ssl-stat",
  statIcon: "ssl-statIcon",
  statIconWide: "ssl-statIconWide",
  appear: "ssl-appear",
  scale: "ssl-scale",
  soft: "ssl-soft",
  mask: "ssl-mask",
  pop: "ssl-pop",
  btnIn: "ssl-btnIn",
  side: "ssl-side",
  statIn: "ssl-statIn",
  isIn: "ssl-isIn",
};

// The landing page at "/": one screen, entrance motion, links into the app.

const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4";

const NAV = [
  { label: "Mentor view", href: "/mentor", motion: s.scale, d: "0.16s" },
  { label: "Team view", href: "/team/nexus", motion: s.soft, d: "0.28s" },
  { label: "Split a PRD", href: "/plan", motion: s.scale, d: "0.40s" },
  { label: "Paste a repo", href: "/connect", motion: s.soft, d: "0.52s" },
];

const delay = (d: string) => ({ "--d": d }) as CSSProperties;

export default function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Each animated element settles into .isIn when its own animation ends.
  // If animations never start (blocked or unsupported), show everything at once.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>(`.${s.appear}, .${s.heroPhoto}`));
    const settle = (item: HTMLElement) => item.classList.add(s.isIn);
    const handlers = items.map((item) => {
      const onEnd = (e: AnimationEvent) => {
        if (e.target === item) settle(item);
      };
      item.addEventListener("animationend", onEnd);
      return () => item.removeEventListener("animationend", onEnd);
    });
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const moving =
          typeof el.getAnimations === "function" &&
          el.getAnimations({ subtree: true }).some((a) => a.playState === "running" || a.playState === "finished");
        if (!moving) items.forEach(settle);
      });
    });
    return () => {
      handlers.forEach((off) => off());
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  // Menu: Escape and a wide screen close it; the page behind does not scroll while open.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    const wide = window.matchMedia("(min-width: 901px)");
    const onWide = () => wide.matches && setMenuOpen(false);
    const scroller = root.current;
    const before = scroller?.style.overflowY ?? "";
    if (scroller) scroller.style.overflowY = "hidden";
    window.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      window.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
      if (scroller) scroller.style.overflowY = before;
    };
  }, [menuOpen]);

  return (
    <div ref={root} className={`${s.root} ${menuOpen ? s.menuOpen : ""}`}>
      <div className={s.grain} aria-hidden="true" />
      <video className={s.heroPhoto} src={HERO_VIDEO} autoPlay muted loop playsInline preload="auto" aria-hidden="true" />

      <div className={s.page}>
        <div className={s.menuBackdrop} onClick={() => setMenuOpen(false)} aria-hidden="true" />

        <header className={s.header}>
          <a href="#top" className={`${s.logo} ${s.appear} ${s.scale}`} style={delay("0.08s")} aria-label="SquadSync">
            <LogoMark />
            <span>
              Squad<span className={s.logoSuffix}>Sync</span>
            </span>
          </a>

          <nav id="site-nav" className={s.nav} aria-label="Primary">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`${s.navLink} ${s.appear} ${n.motion}`}
                style={delay(n.d)}
                onClick={() => setMenuOpen(false)}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className={s.headerRight}>
            <Link href="/mentor" className={`${s.btn} ${s.btnSolid} ${s.appear} ${s.scale}`} style={delay("0.34s")}>
              Open dashboard
            </Link>
            <button
              type="button"
              className={`${s.burger} ${s.appear} ${s.scale}`}
              style={delay("0.34s")}
              aria-controls="site-nav"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className={s.burgerBar} />
              <span className={s.burgerBar} />
              <span className={s.burgerBar} />
            </button>
          </div>
        </header>

        <main id="top" className={s.hero}>
          <div className={s.heroCopy}>
            <span className={`${s.badge} ${s.appear} ${s.pop}`} style={delay("0.22s")}>
              <Sparkle />
              Collaboration risk radar for student teams
            </span>

            <h1 className={s.h1}>
              <span className={s.headlineLine}>
                <span className={`${s.headlineText} ${s.appear} ${s.mask}`} style={delay("0.42s")}>
                  Spot <em>merge conflicts</em> before
                </span>
              </span>
              <span className={s.headlineLine}>
                <span className={`${s.headlineText} ${s.appear} ${s.mask}`} style={delay("0.62s")}>
                  they break your team.
                </span>
              </span>
            </h1>

            <p className={`${s.lede} ${s.appear} ${s.soft}`} style={delay("0.82s")}>
              SquadSync reads your Git history and task board, then shows each risk with its evidence and one next step.
            </p>

            <div className={s.heroActions}>
              <Link href="/team/nexus" className={`${s.btn} ${s.btnSolid} ${s.appear} ${s.btnIn}`} style={delay("0.96s")}>
                See a live team
              </Link>
              <Link href="/connect" className={`${s.btn} ${s.btnGhost} ${s.appear} ${s.side}`} style={delay("1.10s")}>
                Analyse your repo
              </Link>
            </div>
          </div>
        </main>

        <footer className={s.stats}>
          <Stat d="1.12s" icon={<RulesIcon />}>
            15 risk rules, each backed by evidence
          </Stat>
          <Stat d="1.28s" icon={<CommitIcon />}>
            0% weight on commit count
          </Stat>
          <Stat d="1.44s" icon={<TeamIcon />}>
            Built for student teams of up to 12
          </Stat>
        </footer>
      </div>
    </div>
  );
}

function Stat({ d, icon, children }: { d: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className={`${s.stat} ${s.appear} ${s.statIn}`} style={delay(d)}>
      {icon}
      <span>{children}</span>
    </div>
  );
}

function LogoMark() {
  return (
    <svg className={s.logoMark} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <g transform="rotate(-30 12 12)">
        <circle cx="7.3" cy="3.2" r="1.45" />
        <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
        <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
        <circle cx="16.7" cy="20.8" r="1.45" />
      </g>
    </svg>
  );
}

function Sparkle() {
  return (
    <svg className={s.badgeStar} viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
      <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" />
    </svg>
  );
}

/** Two pills joined: two branches, one merge. */
function RulesIcon() {
  return (
    <svg className={s.statIcon} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="ss-pill-a" x1="3" y1="2" x2="14" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.38" />
          <stop offset="1" stopColor="#3a3a3a" stopOpacity="0.62" />
        </linearGradient>
        <linearGradient id="ss-pill-b" x1="13" y1="2" x2="24" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3a3a3a" stopOpacity="0.38" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.62" />
        </linearGradient>
      </defs>
      <rect x="3.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#ss-pill-a)" />
      <rect x="13.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#ss-pill-b)" />
      <rect x="9.2" y="10.9" width="5.6" height="2.2" rx="1.1" fill="#4a4a4a" />
    </svg>
  );
}

function CommitIcon() {
  return (
    <svg className={s.statIcon} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="6.2" fill="#ffffff" />
      <path d="M12 7.1v7.4" stroke="#111111" strokeWidth="1.85" strokeLinecap="round" fill="none" />
      <path d="M8.15 12.35L12 16.2l3.85-3.85" stroke="#111111" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg className={s.statIconWide} viewBox="0 0 40 22" aria-hidden="true">
      <circle cx="10.2" cy="11" r="9.2" fill="#2b2b2b" />
      <path d="M5.9 8.6l1.2-3.4 2.2 2.4z M14.5 8.6l-1.2-3.4-2.2 2.4z" fill="#f4f4f4" />
      <ellipse cx="10.2" cy="12.1" rx="4.15" ry="3.7" fill="#f4f4f4" />
      <circle cx="8.6" cy="11.6" r="0.7" fill="#1a1a1a" />
      <circle cx="11.8" cy="11.6" r="0.7" fill="#1a1a1a" />
      <circle cx="20.2" cy="11" r="9.2" fill="#ffffff" />
      <circle cx="17.4" cy="9.6" r="1.7" fill="#111111" />
      <circle cx="23" cy="9.6" r="1.7" fill="#111111" />
      <ellipse cx="20.2" cy="12.4" rx="1" ry="0.7" fill="#111111" />
      <path d="M17.6 14.4q2.6 2.2 5.2 0" stroke="#111111" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <circle cx="30.2" cy="11" r="9.2" fill="#f26b1d" />
      <text x="30.2" y="15.1" fontSize="12.5" fontWeight="700" textAnchor="middle" fill="#ffffff" fontFamily="Inter, system-ui, sans-serif">
        s
      </text>
    </svg>
  );
}
