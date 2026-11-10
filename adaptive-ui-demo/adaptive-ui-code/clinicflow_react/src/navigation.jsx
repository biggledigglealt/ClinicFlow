// Screen-to-screen navigation INSIDE one tab (like Flutter's Navigator).
//
// The idea: a "stack" of screens. Opening a screen puts it on top of the stack.
// The back arrow removes the top one. Only the top screen is shown.
//
//   stack: [ HomeScreen, PickLocationScreen, SelectDateScreen ]   <- top is shown
//
// Each tab (Home, Profile, ...) has its own FlowNavigator, so the navigation bar
// or side rail stays on screen while you move through the booking screens.

import { createContext, useContext, useMemo, useRef, useState } from 'react';

const NavContext = createContext(null);

// Screens call useNav() to get: push, pop, popToRoot, replaceAfterRoot, canPop.
export function useNav() {
  return useContext(NavContext); // null if the screen is not inside a FlowNavigator
}

// root = the first screen of the stack (for example <HomeScreen />).
export function FlowNavigator({ root }) {
  const nextId = useRef(1); // gives every screen a unique id so React resets its state
  const [stack, setStack] = useState([{ id: 0, element: root }]);

  const nav = useMemo(
    () => ({
      // Open a screen on top of the current one.
      push: (element) => setStack((s) => [...s, { id: nextId.current++, element }]),
      // Go back one screen (never removes the first one).
      pop: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
      // Go all the way back to the first screen.
      popToRoot: () => setStack((s) => [s[0]]),
      // Replace everything except the first screen with one new screen.
      // (Used after confirming a booking so the back arrow cannot confirm twice.)
      replaceAfterRoot: (element) => setStack((s) => [s[0], { id: nextId.current++, element }]),
      canPop: stack.length > 1,
    }),
    [stack.length]
  );

  const top = stack[stack.length - 1];
  return (
    <NavContext.Provider value={nav}>
      {/* key = id: a new screen always starts fresh */}
      <div key={top.id} className="screen">
        {top.element}
      </div>
    </NavContext.Provider>
  );
}
