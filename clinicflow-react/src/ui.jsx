// Dialog: a pop-up box over a dimmed background.
// The adaptive layout uses it for the Contact and Support pop-ups.
//   title    = heading text
//   children = the message
//   actions  = the buttons shown at the bottom
//   onClose  = called when the user clicks outside the box or presses Escape

import { useEffect } from 'react';

export function Dialog({ title, children, actions, onClose }) {
  // Listen for the Escape key while the dialog is open.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey); // clean up when closed
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      {/* stopPropagation: clicking INSIDE the box should not close it */}
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <div className="dialog-body">{children}</div>
        <div className="dialog-actions">{actions}</div>
      </div>
    </div>
  );
}
