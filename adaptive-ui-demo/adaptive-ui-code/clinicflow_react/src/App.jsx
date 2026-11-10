// THE APP = adaptive layout + your sketched screens.
//
// FILES (all in the src/ folder):
//   main.jsx            starts the app
//   App.jsx             this file: lists the pages of the app
//   adaptiveLayout.jsx  the phone / tablet / desktop frame (the adaptive UI)
//   navigation.jsx      moving between screens inside a tab
//   screens.jsx         every screen from your sketches
//   appData.js          sample clinics, appointments, notifications
//   ui.jsx, Icon.jsx    small reusable pieces (pop-up, calendar, icons)
//   styles.css          colours, spacing and the look of everything

import { AdaptiveScaffold } from './adaptiveLayout.jsx';
import { useAppData } from './appData.js';
import { HomeFlow, NotificationsScreen, ComingSoonScreen } from './screens.jsx';

export default function App() {
  // useAppData redraws the frame when the data changes, which keeps the
  // number on the bell badge up to date.
  const data = useAppData();

  return (
    <AdaptiveScaffold
      unreadCount={data.unreadCount}
      // THE PAGES OF THE APP. Each entry becomes a tab (phone) or a rail item (wide).
      // To add a page, add one more entry here.
      //   label    = text in the navigation
      //   icon     = a name from Icon.jsx
      //   render   = a function that returns the page
      //   isAlerts = true for the notifications page (opened by the bell icon, no bottom tab)
      destinations={[
        { label: 'Home', icon: 'home', render: () => <HomeFlow /> },
        { label: 'Profile', icon: 'user', render: () => <ComingSoonScreen title="Profile" icon="user" /> },
        { label: 'Settings', icon: 'sliders', render: () => <ComingSoonScreen title="Settings" icon="sliders" /> },
        { label: 'Alerts', icon: 'bell', isAlerts: true, render: () => <NotificationsScreen /> },
      ]}
    />
  );
}
