// THE ADAPTIVE LAYOUT SYSTEM
//
// This file decides HOW THE APP IS ARRANGED on different screen sizes.
// It contains no booking logic and no real screens. Your actual screens get
// plugged in through the `destinations` list (see App.jsx).
//
// The idea in one sentence:
//   "Measure the window width, then show either a phone layout or a
//    tablet/desktop layout around the same pages."
//
//   PHONE   (700 px or narrower):  [ top bar with menu + bell ]
//                                    [  page   ]
//                                    [ bottom navigation bar ]
//
//   WIDE    (701 px or wider):       [ top bar with language + bell ]
//                                    [ side rail | page            ]
//                                    [ contact / support footer    ]

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { Dialog } from './ui.jsx';

// ------------------------------------------------------------
// 1. BREAKPOINTS: the sizes where the layout changes.
//    Change a number here and the whole app follows.
//
//   WIDTH (left to right):
//     under 360     tiny phone: less padding
//     700 or less   phone layout: bottom bar + hamburger menu
//     701 and up    tablet/desktop layout: side rail + footer
//     1100 and up   side rail also shows text next to the icons
//     1600 and up   TV / ultrawide: content area gets wider
//     2200 and up   the whole UI scales up (1.25x), then 1.5x at 2560 and 2x at 3400
//                   (4K). This is done in styles.css by raising the root font-size.
//
//   HEIGHT:
//     under 500     short window (phone on its side): the footer is hidden
//                   to save space and Contact/Support move to the hamburger menu
// ------------------------------------------------------------
export const Breakpoints = {
  tiny: 360,
  wide: 701, // the layout switches to the wide-screen version from this width up (700 or less = phone)
  extended: 1100,
  huge: 1600,
  shortHeight: 500,
};

// ------------------------------------------------------------
// 2. useWindowSize: the "how big am I?" part.
//    Returns the window's current width and height in pixels, and updates
//    automatically whenever the window is resized or a phone is rotated.
//    (This is the JavaScript version of Flutter's MediaQuery.)
// ------------------------------------------------------------
export function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize); // run onResize every time the window changes
    return () => window.removeEventListener('resize', onResize); // stop listening when not needed
  }, []);

  return size;
}

// useUiScale: how much bigger than normal the interface currently is.
// styles.css raises the root font-size on 4K / TV screens (16px = 1x, 32px = 2x),
// so items measured in real pixels (like AdaptiveGrid's minWidth) must grow too.
function useUiScale() {
  const read = () => parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1;
  const [scale, setScale] = useState(read);

  useEffect(() => {
    const onResize = () => setScale(read());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return scale;
}

// Measures the width of ONE element (not the whole window). Used by AdaptiveGrid.
// (This is the JavaScript version of Flutter's LayoutBuilder.)
function useElementWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width); // measure once at the start
    const observer = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    observer.observe(el); // measure again whenever the element's width changes
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

// ------------------------------------------------------------
// 3. AdaptiveScaffold: the frame around every page.
//
//   destinations = list of pages. Each one looks like:
//     { label: 'Home', icon: 'home', render: () => <HomeFlow />, isAlerts: false }
//   unreadCount  = number shown on the bell badge
//   onLanguageChanged = called with 'en' or 'fr'
//   alertsAsTab  = false (default, matches your Home sketch): the bell icon opens the
//                  alerts page on every screen size.
//                  true: on phones, alerts becomes a tab in the bottom bar instead.
// ------------------------------------------------------------
export function AdaptiveScaffold({ destinations, unreadCount = 0, onLanguageChanged, alertsAsTab = false }) {
  // STEP 1: measure the window and decide which layout to use.
  const { width, height } = useWindowSize();
  const isWide = width >= Breakpoints.wide;
  const isExtended = width >= Breakpoints.extended;
  // A short window (for example a phone held sideways) has little height to spare.
  const isShort = height < Breakpoints.shortHeight;

  // Things the frame remembers:
  const [index, setIndex] = useState(0); // which page is open
  const [lastTab, setLastTab] = useState(0); // last open page that has a tab
  const [language, setLanguage] = useState('en'); // 'en' or 'fr'
  const [drawerOpen, setDrawerOpen] = useState(false); // is the hamburger menu open?
  const [info, setInfo] = useState(null); // 'Contact' or 'Support' pop-up, or null

  // Position of the notifications page in the list (-1 if there isn't one).
  const alertsIndex = destinations.findIndex((d) => d.isAlerts);
  const allIndexes = destinations.map((_, i) => i);
  // Side rail: every page EXCEPT alerts (alerts is the bell icon instead).
  const railIndexes = allIndexes.filter((i) => !destinations[i].isAlerts);
  // Phone bottom bar: same, unless alertsAsTab is true.
  const phoneIndexes = allIndexes.filter((i) => alertsAsTab || !destinations[i].isAlerts);

  function goTo(i) {
    setIndex(i);
    // Remember the last page that has a tab, so the bottom bar can keep
    // highlighting it while the alerts page (which has no tab) is open.
    if (phoneIndexes.includes(i)) setLastTab(i);
  }

  const showBell = alertsIndex >= 0 && (isWide || !alertsAsTab);
  // The hamburger menu appears on phones, and on short wide windows where the footer is hidden.
  const showMenu = !isWide || isShort;
  const selectedPhone = phoneIndexes.includes(index) ? index : lastTab;
  const selectedRail = railIndexes.includes(index) ? index : null;

  // STEP 2: build the page that is currently selected.
  const page = destinations[index].render();

  const closeInfo = () => setInfo(null);

  return (
    <div className="shell">
      {/* ---------- TOP BAR (both layouts) ---------- */}
      <header className="appbar">
        {showMenu && (
          <button type="button" className="icon-btn" aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
            <Icon name="menu" />
          </button>
        )}
        <div className="brand">
          <Icon name="hospital" />
          <span>ClinicFlow</span>
        </div>
        <div className="appbar-spacer" />

        {/* Language quick-select: shown on every page. */}
        <div className="seg" role="group" aria-label="Language">
          {['en', 'fr'].map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={language === l}
              onClick={() => {
                setLanguage(l);
                onLanguageChanged?.(l);
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Bell icon with unread badge. Shown on every screen size (like the sketch)
            unless alertsAsTab is true, which moves it to a phone tab. */}
        {showBell && (
          <button
            type="button"
            className="icon-btn"
            aria-label={destinations[alertsIndex].label + (unreadCount > 0 ? `, ${unreadCount} unread` : '')}
            onClick={() => goTo(alertsIndex)}
          >
            <Badge count={unreadCount}>
              <Icon name="bell" />
            </Badge>
          </button>
        )}
      </header>

      {/* ---------- BODY ---------- */}
      {/* The <main> page always sits in the same place in the tree, so it keeps
          its state (for example a half-finished booking) when the window is
          resized or rotated and the layout switches. */}
      <div className="body">
        {/* SIDE RAIL (wide layouts only) */}
        {isWide && (
          <nav className={'rail' + (isExtended ? ' extended' : '')} aria-label="Main navigation">
            {railIndexes.map((i) => {
              const selected = i === selectedRail;
              // On short windows only the open page shows a label (saves height).
              const showLabel = isExtended || !isShort || selected;
              return (
                <button
                  key={i}
                  type="button"
                  className={'rail-item' + (selected ? ' selected' : '')}
                  aria-current={selected ? 'page' : undefined}
                  aria-label={destinations[i].label}
                  onClick={() => goTo(i)}
                >
                  <Icon name={destinations[i].icon} />
                  {showLabel && <span>{destinations[i].label}</span>}
                </button>
              );
            })}
          </nav>
        )}

        <div className="main-col">
          {/* key={index}: opening a different tab starts that page fresh */}
          <main key={index} className="page">
            {page}
          </main>
          {/* FOOTER (wide layouts only, hidden on short windows) */}
          {isWide && !isShort && (
            <footer className="footer">
              <button type="button" className="btn btn-text" onClick={() => setInfo('Contact')}>
                <Icon name="mail" size={20} /> Contact
              </button>
              <button type="button" className="btn btn-text" onClick={() => setInfo('Support')}>
                <Icon name="help" size={20} /> Support
              </button>
            </footer>
          )}
        </div>
      </div>

      {/* ---------- BOTTOM NAVIGATION (phone only) ---------- */}
      {!isWide && (
        <nav className="bottom-nav" aria-label="Main navigation">
          {phoneIndexes.map((i) => {
            const d = destinations[i];
            const selected = i === selectedPhone;
            return (
              <button
                key={i}
                type="button"
                className={'bottom-item' + (selected ? ' selected' : '')}
                aria-current={selected ? 'page' : undefined}
                onClick={() => goTo(i)}
              >
                <span className="bottom-icon">
                  {/* Only matters when alertsAsTab is true: unread-count badge. */}
                  <Badge count={d.isAlerts ? unreadCount : 0}>
                    <Icon name={d.icon} />
                  </Badge>
                </span>
                {d.label}
              </button>
            );
          })}
        </nav>
      )}

      {/* ---------- HAMBURGER MENU ---------- */}
      {drawerOpen && (
        <div className="overlay left" onClick={() => setDrawerOpen(false)}>
          <aside className="drawer" aria-label="Menu" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-title">ClinicFlow</div>
            {['Contact', 'Support'].map((name) => (
              <button
                key={name}
                type="button"
                className="drawer-item"
                onClick={() => {
                  setDrawerOpen(false);
                  setInfo(name);
                }}
              >
                <Icon name={name === 'Contact' ? 'mail' : 'help'} />
                {name}
              </button>
            ))}
          </aside>
        </div>
      )}

      {/* ---------- CONTACT / SUPPORT POP-UP ---------- */}
      {info && (
        <Dialog
          title={info}
          onClose={closeInfo}
          actions={
            <button type="button" className="btn btn-text" onClick={closeInfo}>
              Close
            </button>
          }
        >
          [{info} details go here]
        </Dialog>
      )}
    </div>
  );
}

// A small red number on top of an icon (like the unread count on the bell).
function Badge({ count, children }) {
  return (
    <span className="badge-wrap">
      {children}
      {count > 0 && <span className="badge">{count}</span>}
    </span>
  );
}

// ------------------------------------------------------------
// 4. HELPERS YOUR PAGES CAN USE
// ------------------------------------------------------------

// ContentFrame: wrap a page's content in this. It
//  - scrolls if the content is taller than the screen,
//  - adds padding (less on tiny screens),
//  - stops the content from stretching too wide on big monitors
//    (max 900 px, or 1200 px on TV / ultrawide screens; these are rem-based,
//    so on 4K they scale up together with everything else),
//  - puts equal spacing between the children.
export function ContentFrame({ children }) {
  const { width } = useWindowSize();
  const maxWidth = width >= Breakpoints.huge ? 1200 : 900;
  const padding = width < Breakpoints.tiny ? 8 : 16;
  return (
    <div className="content-scroll">
      <div className="content" style={{ maxWidth: `${maxWidth / 16}rem`, padding: `${padding / 16}rem` }}>
        {children}
      </div>
    </div>
  );
}

// AdaptiveGrid: puts items in rows. The number of columns depends on the
// available width: 1 column on a phone, 2 or 3 on tablets and desktops.
//   minWidth = the narrowest an item is allowed to get before a column is dropped.
export function AdaptiveGrid({ children, minWidth = 260, gap = 12 }) {
  const [ref, width] = useElementWidth();
  const scale = useUiScale(); // 1 normally, 2 on a 4K screen
  // How many columns fit? (at least 1, at most 4)
  const columns = Math.max(1, Math.min(4, Math.floor(width / (minWidth * scale))));
  return (
    <div ref={ref} className="grid" style={{ gap: `${gap / 16}rem`, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {children}
    </div>
  );
}
