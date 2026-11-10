// Small reusable UI pieces: a pop-up Dialog, a Snackbar message, and a calendar.
// (In Flutter these came built in; in React we write them ourselves.)

import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

// ------------------------------------------------------------
// Dialog: a pop-up box over a dimmed background.
//   title   = heading text
//   children = the message
//   actions = the buttons shown at the bottom
//   onClose = called when the user clicks outside the box or presses Escape
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// Snackbar: a small message at the bottom that disappears after 3 seconds.
// ------------------------------------------------------------
export function Snackbar({ message, onDone }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [message, onDone]);

  return message ? (
    <div className="snackbar" role="status">
      {message}
    </div>
  ) : null;
}

// ------------------------------------------------------------
// CalendarPicker: a month grid like the one in your "Select a Date" sketch.
//   value     = the selected date
//   firstDate = earliest date that can be picked (today)
//   lastDate  = latest date that can be picked
//   onChange  = called with the new date when a day is tapped
// ------------------------------------------------------------
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function CalendarPicker({ value, firstDate, lastDate, onChange }) {
  // The month currently shown (the 1st of that month).
  const [month, setMonth] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  const year = month.getFullYear();
  const m = month.getMonth();

  const blanks = new Date(year, m, 1).getDay(); // empty cells before the 1st (0 = Sunday)
  const dayCount = new Date(year, m + 1, 0).getDate(); // number of days in this month
  const days = Array.from({ length: dayCount }, (_, i) => new Date(year, m, i + 1));

  // Arrows are disabled when there is no earlier / later month to show.
  const canPrev = month > new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  const canNext = new Date(year, m + 1, 1) <= lastDate;

  return (
    <div className="calendar">
      <div className="cal-header">
        <button type="button" className="icon-btn dark" aria-label="Previous month" disabled={!canPrev} onClick={() => setMonth(new Date(year, m - 1, 1))}>
          <Icon name="chevronLeft" />
        </button>
        <strong>
          {MONTHS[m]} {year}
        </strong>
        <button type="button" className="icon-btn dark" aria-label="Next month" disabled={!canNext} onClick={() => setMonth(new Date(year, m + 1, 1))}>
          <Icon name="chevronRight" />
        </button>
      </div>
      <div className="cal-grid">
        {WEEKDAY_LETTERS.map((w, i) => (
          <span key={i} className="cal-weekday" aria-hidden="true">
            {w}
          </span>
        ))}
        {Array.from({ length: blanks }, (_, i) => (
          <span key={'b' + i} />
        ))}
        {days.map((d) => (
          <button
            key={d.getDate()}
            type="button"
            className="cal-day"
            aria-pressed={sameDay(d, value)}
            aria-label={d.toDateString()}
            disabled={d < firstDate || d > lastDate}
            onClick={() => onChange(d)}
          >
            {d.getDate()}
          </button>
        ))}
      </div>
    </div>
  );
}
