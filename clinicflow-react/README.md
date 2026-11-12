# ClinicFlow adaptive UI (React + JavaScript)

A small demo of the adaptive layout: a phone layout (bottom navigation bar, hamburger
menu) 700 px wide or less, and a wide-screen layout (side navigation rail, footer) from
701 px up. The interface also scales up on 4K and TV screens.

## Run it
1. Install Node.js (the LTS version).
2. Open this folder in a terminal.
3. `npm install` (only needed once)
4. `npm run dev` (add `-- --port 5174` if port 5173 is already used)
5. Open the address it prints and drag the browser window narrower and wider.

## Files (all in `src/`)
- `adaptiveLayout.jsx`: the adaptive UI (breakpoints, phone and wide layouts)
- `ui.jsx`: the pop-up used by Contact / Support
- `Icon.jsx`: the icons
- `styles.css`: colours, spacing, 4K scaling and the look of everything
- `App.jsx`: the demo pages and how to plug pages into the layout
- `main.jsx`: starts the app
