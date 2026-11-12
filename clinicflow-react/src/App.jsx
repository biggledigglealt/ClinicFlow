// THE DEMO APP = the adaptive layout + a few placeholder pages.
//
// FILES (all in the src/ folder):
//   main.jsx            starts the app
//   App.jsx             this file: lists the pages and shows how to use the layout
//   adaptiveLayout.jsx  THE ADAPTIVE UI (breakpoints, phone and wide layouts)
//   ui.jsx              the pop-up Dialog used by Contact / Support
//   Icon.jsx            the icons
//   styles.css          colours, spacing, 4K scaling and the look of everything
//
// To use the adaptive layout in your own app, give AdaptiveScaffold a list of
// pages (the `destinations` below). Each page is wrapped in ContentFrame, which
// adds padding and stops the content stretching too wide.

import { useState } from 'react';
import { AdaptiveScaffold, AdaptiveGrid, ContentFrame, Breakpoints, useWindowSize } from './adaptiveLayout.jsx';
import Icon from './Icon.jsx';

// A card that shows what the layout system currently sees.
// Resize the browser window and watch the numbers and the layout change.
function LayoutInfo() {
  const { width, height } = useWindowSize();
  const isWide = width >= Breakpoints.wide;
  return (
    <div className="card">
      <h2 className="subtitle">Current layout</h2>
      <p>{isWide ? 'Wide-screen layout (side navigation rail)' : 'Phone layout (bottom navigation bar)'}</p>
      <p className="muted">
        Window size: {width} x {height} px. The layout switches at {Breakpoints.wide} px.
      </p>
    </div>
  );
}

// Home page: some sample cards that sit in 1, 2, 3 or 4 columns depending on the space.
function HomePage() {
  const samples = ['Book an appointment', 'Modify an appointment', 'Cancel an appointment', 'View my appointments', 'Find a clinic', 'Contact support'];
  return (
    <ContentFrame>
      <h1>Adaptive UI demo</h1>
      <LayoutInfo />
      {/* AdaptiveGrid: the number of columns depends on the space available. */}
      <AdaptiveGrid minWidth={260}>
        {samples.map((text) => (
          <div className="card" key={text}>
            <Icon name="calendar" />
            <h2 className="subtitle">{text}</h2>
            <p className="muted">Sample card</p>
          </div>
        ))}
      </AdaptiveGrid>
    </ContentFrame>
  );
}

// A simple placeholder page.
function PlaceholderPage({ title, icon }) {
  return (
    <ContentFrame>
      <h1>{title}</h1>
      <div className="card">
        <Icon name={icon} size={32} />
        <p className="muted">This page is a placeholder.</p>
      </div>
    </ContentFrame>
  );
}

// Alerts page: shows how the number on the bell badge can change.
function AlertsPage({ unread, onMarkRead }) {
  return (
    <ContentFrame>
      <h1>Notifications</h1>
      <div className="card">
        <p>{unread > 0 ? `You have ${unread} unread notification${unread > 1 ? 's' : ''}.` : 'You are all caught up.'}</p>
        <button type="button" className="btn btn-filled" disabled={unread === 0} onClick={onMarkRead}>
          Mark all as read
        </button>
      </div>
    </ContentFrame>
  );
}

export default function App() {
  const [unread, setUnread] = useState(2); // the number shown on the bell badge

  return (
    <AdaptiveScaffold
      unreadCount={unread}
      // THE PAGES OF THE APP. Each entry becomes a tab (phone) or a rail item (wide).
      //   label    = text in the navigation
      //   icon     = a name from Icon.jsx
      //   render   = a function that returns the page
      //   isAlerts = true for the notifications page (opened by the bell icon, no bottom tab)
      destinations={[
        { label: 'Home', icon: 'home', render: () => <HomePage /> },
        { label: 'Profile', icon: 'user', render: () => <PlaceholderPage title="Profile" icon="user" /> },
        { label: 'Settings', icon: 'sliders', render: () => <PlaceholderPage title="Settings" icon="sliders" /> },
        { label: 'Alerts', icon: 'bell', isAlerts: true, render: () => <AlertsPage unread={unread} onMarkRead={() => setUnread(0)} /> },
      ]}
    />
  );
}
