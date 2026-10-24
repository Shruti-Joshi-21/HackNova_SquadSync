"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useTrail } from "@/components/BackButton";
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
  appear: "ssl-appear",
  scale: "ssl-scale",
  soft: "ssl-soft",
  mask: "ssl-mask",
  pop: "ssl-pop",
  btnIn: "ssl-btnIn",
  side: "ssl-side",
  statIn: "ssl-statIn",
  isIn: "ssl-isIn",
  statButton: "ssl-statButton",
  rulesOverlay: "ssl-rulesOverlay",
  rulesPanel: "ssl-rulesPanel",
  rulesHead: "ssl-rulesHead",
  rulesTitle: "ssl-rulesTitle",
  rulesLede: "ssl-rulesLede",
  rulesClose: "ssl-rulesClose",
  rulesGroups: "ssl-rulesGroups",
  rulesGroup: "ssl-rulesGroup",
  rulesGroupTitle: "ssl-rulesGroupTitle",
  rulesList: "ssl-rulesList",
  rulesName: "ssl-rulesName",
  rulesText: "ssl-rulesText",
  rulesFoot: "ssl-rulesFoot",
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

// The 15 rules the engine runs (RiskKind in src/lib/types.ts), in plain words.
const RULES: { group: string; items: [string, string][] }[] = [
  {
    group: "Work and reviews",
    items: [
      ["Uneven workload", "One person does far more, or far less, than the team's even share. Commit count is never used."],
      ["Review gap", "Code merged with no review, or a member who never reviews anyone's work."],
      ["Late integration", "Most code lands in the last 3 days, or a pull request stays open over a week."],
      ["Deadline slip", "At the pace of the last 7 days, the open tasks finish after the deadline."],
    ],
  },
  {
    group: "Conflict radar",
    items: [
      ["Same lines edited", "Two open branches change the same lines of one file. Likely conflict."],
      ["Same file edited", "Two open branches change one file on different lines. Possible conflict."],
      ["Pull request conflicting", "GitHub already reports that the pull request cannot merge. Certain."],
      ["Edit versus delete", "One branch edits a file that another branch deletes or renames."],
      ["Same new file", "Two branches each add a new file at the same path."],
      ["Lockfile clash", "Two branches change package-lock.json, which should be regenerated, not merged by hand."],
      ["Branch drift", "A branch has fallen more than 10 commits behind main."],
      ["Direct push to main", "A commit landed on main without a pull request while other work was open."],
    ],
  },
  {
    group: "Stalled work and the plan",
    items: [
      ["Stale branch", "A task is still open, but its branch has had no push for 5 days."],
      ["Unpushed work", "A task in progress for 5 days with nothing on GitHub. A proxy: we cannot see laptops."],
      ["Off the plan", "Someone edited a folder or shared file that the PRD plan gives to someone else."],
    ],
  },
];

const delay = (d: string) => ({ "--d": d }) as CSSProperties;

export default function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const rulesButton = useRef<HTMLButtonElement>(null);
  const closeRules = useCallback(() => {
    setRulesOpen(false);
    rulesButton.current?.focus();
  }, []);
  useTrail("/"); // so Back on the next page returns here

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

  // The page behind the rules overview does not scroll while it is open.
  useEffect(() => {
    if (!rulesOpen) return;
    const scroller = root.current;
    const before = scroller?.style.overflowY ?? "";
    if (scroller) scroller.style.overflowY = "hidden";
    return () => {
      if (scroller) scroller.style.overflowY = before;
    };
  }, [rulesOpen]);

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
          <Stat d="1.12s" icon={<RulesIcon />} onClick={() => setRulesOpen(true)} buttonRef={rulesButton}>
            15 risk rules, each backed by evidence
          </Stat>
        </footer>
      </div>

      {rulesOpen && (
        <RulesPanel onClose={closeRules} />
      )}
    </div>
  );
}

/** Overview of the 15 rules. Escape, the close button or a click outside closes it. */
function RulesPanel({ onClose }: { onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={s.rulesOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={s.rulesPanel} role="dialog" aria-modal="true" aria-labelledby="rules-title">
        <div className={s.rulesHead}>
          <div>
            <h2 id="rules-title" className={s.rulesTitle}>
              15 risk rules
            </h2>
            <p className={s.rulesLede}>Every risk shows its rule, the evidence from your data, a picture and one next step.</p>
          </div>
          <button ref={close} type="button" className={s.rulesClose} onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className={s.rulesGroups}>
          {RULES.map((g) => (
            <section key={g.group} className={s.rulesGroup}>
              <h3 className={s.rulesGroupTitle}>{g.group}</h3>
              <ul className={s.rulesList}>
                {g.items.map(([name, text]) => (
                  <li key={name}>
                    <span className={s.rulesName}>{name}</span>
                    <span className={s.rulesText}>{text}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className={s.rulesFoot}>
          <Link href="/team/nexus" className={`${s.btn} ${s.btnSolid}`}>
            See them on a live team
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ d, icon, children, onClick, buttonRef }: {
  d: string;
  icon: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  if (onClick) {
    return (
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        aria-haspopup="dialog"
        className={`${s.stat} ${s.statButton} ${s.appear} ${s.statIn}`}
        style={delay(d)}
      >
        {icon}
        <span>{children}</span>
      </button>
    );
  }
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


