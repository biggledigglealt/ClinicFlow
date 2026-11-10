// SCREENS: every screen from your sketches.
//
// THE SCREENS AND HOW THEY CONNECT
//
//   HomeScreen (4 big buttons)
//     |- Book an Appointment -> PickLocationScreen -> SelectDateScreen
//     |                           |                    -> AvailableTimesScreen
//     |                           |                    -> ReviewScreen
//     |                           |                    -> ConfirmedScreen
//     |                           '- "Search by city or postal code" ->
//     |                              ClinicSearchScreen -> ClinicResultsScreen
//     |                              -> ClinicDetailsScreen -> (continues to SelectDateScreen)
//     |- Modify an Appointment -> AppointmentsScreen(modify) -> SelectDateScreen ...
//     |- Cancel an Appointment -> AppointmentsScreen(cancel) -> confirmation pop-up
//     '- View my Appointments  -> AppointmentsScreen(view)
//
//   Plus: NotificationsScreen (opened by the bell icon) and a placeholder page
//   for Profile and Settings (no sketches yet).
//
// All of these screens sit INSIDE the adaptive frame from adaptiveLayout.jsx,
// so the navigation bar / side rail stays visible while you move through a flow.
//
// To open another screen:  nav.push(<SomeScreen prop={value} />)
// To go back:              nav.pop()

import { useState } from 'react';
import { ContentFrame, AdaptiveGrid } from './adaptiveLayout.jsx';
import { FlowNavigator, useNav } from './navigation.jsx';
import Icon from './Icon.jsx';
import { Dialog, Snackbar, CalendarPicker } from './ui.jsx';
import {
  appData,
  useAppData,
  sampleClinics,
  bookingTimes,
  BookingDraft,
  notifMessage,
  notifIcon,
  formatDate,
  formatTime,
  formatDateTime,
  formatKm,
} from './appData.js';

// ============================================================
// 1. BUILDING BLOCKS USED BY MANY SCREENS
// ============================================================

// HomeFlow: gives the Home tab its OWN mini navigator. That is what lets the
// booking screens open inside the page area (rail and top bar stay in place)
// instead of covering the whole window.
export function HomeFlow() {
  return <FlowNavigator root={<HomeScreen />} />;
}

// FlowPage: the standard layout of every screen = back arrow + title, then content.
function FlowPage({ title, children }) {
  const nav = useNav();
  return (
    <ContentFrame>
      <div className="flow-header">
        {/* Only show the back arrow if there is a previous screen to go back to. */}
        {nav?.canPop && (
          <button type="button" className="icon-btn dark" aria-label="Back" onClick={nav.pop}>
            <Icon name="arrowLeft" />
          </button>
        )}
        <h1>{title}</h1>
      </div>
      {children}
    </ContentFrame>
  );
}

// One clinic in a list. Highlights when selected (blue box in your sketches).
//   showNext = true on the Results screen: adds "Next app. Today 2pm"
function ClinicTile({ clinic, selected, onTap, showNext = false }) {
  return (
    <button type="button" className={'clinic-tile' + (selected ? ' selected' : '')} aria-pressed={selected} onClick={onTap}>
      <Icon name="pin" />
      <span className="clinic-info">
        <strong>{clinic.name}</strong>
        <span>{clinic.address}</span>
        {showNext && <span>Next app. {clinic.nextAvailable}</span>}
      </span>
      <span className="km">{formatKm(clinic.km)}</span>
    </button>
  );
}

// A line with a small icon in front, used on the details screen.
function InfoRow({ icon, text }) {
  return (
    <div className="info-row">
      <Icon name={icon} size={20} />
      <span>{text}</span>
    </div>
  );
}

// ============================================================
// 2. HOME (sketch 1): four big coloured buttons
// ============================================================

export function HomeScreen() {
  const nav = useNav();
  return (
    <FlowPage title="Appointment Management">
      {/* AdaptiveGrid: one column on a phone, two on a tablet/desktop. */}
      <AdaptiveGrid minWidth={300}>
        <HomeButton
          icon="plusSquare"
          label="Book an Appointment"
          border="#1e4fc2" // blue
          fill="#e8eefb"
          onClick={() => nav.push(<PickLocationScreen draft={new BookingDraft()} />)}
        />
        <HomeButton
          icon="edit"
          label="Modify an Appointment"
          border="#2e7d32" // green
          fill="#e8f5e9"
          onClick={() => nav.push(<AppointmentsScreen mode="modify" />)}
        />
        <HomeButton
          icon="xCircle"
          label="Cancel an Appointment"
          border="#c62828" // red
          fill="#fdecea"
          onClick={() => nav.push(<AppointmentsScreen mode="cancel" />)}
        />
        <HomeButton
          icon="calendar"
          label="View my Appointments"
          border="#6a1b9a" // purple
          fill="#f3e5f5"
          onClick={() => nav.push(<AppointmentsScreen mode="view" />)}
        />
      </AdaptiveGrid>
    </FlowPage>
  );
}

// border = outline and icon colour, fill = pale background
function HomeButton({ icon, label, border, fill, onClick }) {
  return (
    <button type="button" className="home-btn" style={{ '--c': border, '--f': fill }} onClick={onClick}>
      <Icon name={icon} size={32} />
      <span>{label}</span>
    </button>
  );
}

// ============================================================
// 3. CLINIC FINDER (sketch 2): Search -> Results -> Details
// ============================================================

// Screen "1. Search"
function ClinicSearchScreen({ draft }) {
  const nav = useNav();
  // The choices the user makes on this screen (starting values match the sketch).
  const [location, setLocation] = useState('Ottawa, ON');
  const [maxKm, setMaxKm] = useState(15);
  const [familyOnly, setFamilyOnly] = useState(true);
  const [todayOnly, setTodayOnly] = useState(true);

  return (
    <FlowPage title="1. Search">
      <div className="card form">
        {/* TODO (backend): the Clinic Finder would use this text to look up clinics.
            For now the sample clinics are filtered by distance only. */}
        <label>
          Location (city / postal code)
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label>
          Maximum Distance:
          <select value={maxKm} onChange={(e) => setMaxKm(Number(e.target.value))}>
            {[5, 10, 15, 25].map((k) => (
              <option key={k} value={k}>
                {k} km
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Filters:</legend>
          <label className="check">
            <input type="checkbox" checked={familyOnly} onChange={(e) => setFamilyOnly(e.target.checked)} />
            Family Medicine
          </label>
          <label className="check">
            <input type="checkbox" checked={todayOnly} onChange={(e) => setTodayOnly(e.target.checked)} />
            Available today
          </label>
        </fieldset>
      </div>
      <button
        type="button"
        className="btn btn-filled"
        onClick={() => nav.push(<ClinicResultsScreen draft={draft} maxKm={maxKm} familyOnly={familyOnly} todayOnly={todayOnly} />)}
      >
        Search
      </button>
    </FlowPage>
  );
}

// Screen "2. Results"
function ClinicResultsScreen({ draft, maxKm, familyOnly, todayOnly }) {
  const nav = useNav();
  // Clinics that match the search choices (the sample list is already sorted by distance).
  const results = sampleClinics.filter(
    (c) => c.km <= maxKm && (!familyOnly || c.familyMedicine) && (!todayOnly || c.availableToday)
  );
  // The first result starts highlighted, like in the sketch.
  const [selected, setSelected] = useState(results[0] ?? null);

  return (
    <FlowPage title="2. Results">
      {results.length === 0 ? (
        <p>No clinics match. Try a larger distance or fewer filters.</p>
      ) : (
        <AdaptiveGrid minWidth={380}>
          {results.map((c) => (
            <ClinicTile key={c.name} clinic={c} selected={c === selected} showNext onTap={() => setSelected(c)} />
          ))}
        </AdaptiveGrid>
      )}
      <button
        type="button"
        className="btn btn-filled"
        disabled={!selected}
        onClick={() => nav.push(<ClinicDetailsScreen draft={draft} clinic={selected} />)}
      >
        View Availability
      </button>
    </FlowPage>
  );
}

// Screen "3. Clinic Details"
function ClinicDetailsScreen({ draft, clinic }) {
  const nav = useNav();
  return (
    <FlowPage title="3. Clinic Details">
      <h2 className="subtitle">{clinic.name}</h2>
      <div className="card">
        <InfoRow icon="distance" text={formatKm(clinic.km)} />
        <InfoRow icon="pin" text={clinic.address} />
        <InfoRow icon="phone" text={clinic.phone} />
        <p className="label">Services:</p>
        {clinic.familyMedicine && <span className="chip">Family medicine</span>}
        <p className="label">Next available app:</p>
        <p>{clinic.nextAvailable}</p>
      </div>
      <button
        type="button"
        className="btn btn-filled"
        onClick={() => {
          draft.clinic = clinic; // remember the choice, then continue the booking
          nav.push(<SelectDateScreen draft={draft} />);
        }}
      >
        Continue to booking
      </button>
    </FlowPage>
  );
}

// ============================================================
// 4. BOOKING (sketch 3): Pick Location -> Date -> Time -> Review -> Confirmed
// ============================================================

// Screen "Pick Location"
function PickLocationScreen({ draft }) {
  const nav = useNav();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null); // the highlighted clinic

  // Keep only the clinics whose name or address contains the typed text.
  const q = search.trim().toLowerCase();
  const shown = sampleClinics.filter((c) => !q || c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q));

  return (
    <FlowPage title="Pick Location">
      <label className="field-label" htmlFor="clinic-search">
        Find a clinic:
      </label>
      <input
        id="clinic-search"
        className="search-input"
        type="search"
        placeholder="Search location..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {shown.length === 0 ? (
        <p>No clinics match your search.</p>
      ) : (
        <AdaptiveGrid minWidth={380}>
          {shown.map((c) => (
            <ClinicTile key={c.name} clinic={c} selected={c === selected} onTap={() => setSelected(c)} />
          ))}
        </AdaptiveGrid>
      )}
      {/* Link to the Clinic Finder flow (screens 1 to 3 of sketch 2). */}
      <div>
        <button type="button" className="btn btn-text" onClick={() => nav.push(<ClinicSearchScreen draft={draft} />)}>
          <Icon name="compass" size={20} /> Search by city or postal code
        </button>
      </div>
      <button
        type="button"
        className="btn btn-filled"
        // Disabled (greyed out) until a clinic is chosen.
        disabled={!selected}
        onClick={() => {
          draft.clinic = selected;
          nav.push(<SelectDateScreen draft={draft} />);
        }}
      >
        NEXT
      </button>
    </FlowPage>
  );
}

const today = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

// Screen "Select a Date"
function SelectDateScreen({ draft }) {
  const nav = useNav();
  const [selected, setSelected] = useState(draft.date ?? today());
  const first = today();
  const last = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 90); // up to 90 days ahead

  return (
    <FlowPage title="Select a Date">
      <h2 className="subtitle">{draft.clinic.name}</h2>
      <div className="calendar-wrap">
        <CalendarPicker value={selected} firstDate={first} lastDate={last} onChange={setSelected} />
      </div>
      <button
        type="button"
        className="btn btn-filled"
        onClick={() => {
          draft.date = selected;
          nav.push(<AvailableTimesScreen draft={draft} />);
        }}
      >
        NEXT
      </button>
    </FlowPage>
  );
}

// Screen "Available Times"
function AvailableTimesScreen({ draft }) {
  const nav = useNav();
  useAppData(); // redraw if the bookings change
  const [chosen, setChosen] = useState(null); // the time button the user tapped
  const date = draft.date;
  const now = new Date();

  // Combine the chosen date with each time of day from bookingTimes.
  const slots = bookingTimes.map((t) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), t.hour, t.minute));

  // A time is unavailable if it is already past or already booked at this clinic.
  const unavailable = (s) => s < now || appData.isTaken(draft.clinic, s, draft.editing);

  return (
    <FlowPage title="Available Times">
      <h2 className="subtitle">{formatDate(date)}</h2>
      <AdaptiveGrid minWidth={220}>
        {slots.map((s) => {
          const isChosen = chosen && s.getTime() === chosen.getTime();
          return (
            <button
              key={s.getTime()}
              type="button"
              className={'btn time-btn ' + (isChosen ? 'btn-tonal' : 'btn-outlined')}
              aria-pressed={!!isChosen}
              disabled={!isChosen && unavailable(s)} // disabled = greyed out
              onClick={() => setChosen(s)}
            >
              {isChosen && <Icon name="check" size={18} />}
              {formatTime(s)}
            </button>
          );
        })}
      </AdaptiveGrid>
      {slots.some(unavailable) && <p className="muted">Greyed-out times are not available.</p>}
      <button
        type="button"
        className="btn btn-filled"
        disabled={!chosen}
        onClick={() => {
          draft.time = chosen;
          nav.push(<ReviewScreen draft={draft} />);
        }}
      >
        NEXT
      </button>
    </FlowPage>
  );
}

// Screen "Review Details"
function ReviewScreen({ draft }) {
  const nav = useNav();
  const { clinic, time } = draft;
  return (
    <FlowPage title="Review Details">
      <div className="card">
        <InfoRow icon="pin" text={`${clinic.name}, ${clinic.address}`} />
        <InfoRow icon="calendar" text={formatDate(time)} />
        <InfoRow icon="clock" text={formatTime(time)} />
      </div>
      <button
        type="button"
        className="btn btn-filled"
        onClick={() => {
          // Save the appointment: new booking, or the changed time of an existing one.
          if (draft.editing) appData.reschedule(draft.editing, time);
          else appData.book(clinic, time);
          // Show the confirmation and remove the booking screens from the history,
          // so the back arrow cannot confirm twice.
          nav.replaceAfterRoot(<ConfirmedScreen draft={draft} />);
        }}
      >
        <Icon name="check" size={20} /> Confirm
      </button>
      {/* Edit = go back one step and change the time. */}
      <button type="button" className="btn btn-outlined" onClick={nav.pop}>
        Edit
      </button>
    </FlowPage>
  );
}

// Screen "Appointment Confirmed!"
function ConfirmedScreen({ draft }) {
  const nav = useNav();
  const { clinic, time } = draft;
  return (
    <FlowPage title={draft.editing ? 'Appointment Updated!' : 'Appointment Confirmed!'}>
      <div className="card confirmed">
        <span className="big-check">
          <Icon name="checkCircle" size={72} />
        </span>
        <p>&bull; {formatDate(time)}</p>
        <p>&bull; {formatTime(time)}</p>
        <p>
          &bull; {clinic.name}, {clinic.address}
        </p>
      </div>
      {/* Done = back to the Home screen. */}
      <button type="button" className="btn btn-filled" onClick={nav.popToRoot}>
        Done
      </button>
    </FlowPage>
  );
}

// ============================================================
// 5. MY APPOINTMENTS: used by View, Modify and Cancel
//    (these screens were not in your sketches, so they are simple lists)
// ============================================================

const APPOINTMENTS_TITLES = {
  view: 'My Appointments',
  modify: 'Modify an Appointment',
  cancel: 'Cancel an Appointment',
};

// mode = 'view', 'modify' or 'cancel'
function AppointmentsScreen({ mode }) {
  const data = useAppData(); // redraws this list whenever the data changes (e.g. after a cancel)
  const [message, setMessage] = useState('');
  const list = data.upcoming;

  return (
    <FlowPage title={APPOINTMENTS_TITLES[mode]}>
      {list.length === 0 && <p>You have no appointments.</p>}
      {list.map((a) => (
        <AppointmentCard key={a.id} a={a} mode={mode} onCancelled={() => setMessage('Appointment cancelled.')} />
      ))}
      <Snackbar message={message} onDone={() => setMessage('')} />
    </FlowPage>
  );
}

function AppointmentCard({ a, mode, onCancelled }) {
  const nav = useNav();
  const [confirming, setConfirming] = useState(false); // is the "are you sure?" pop-up open?

  return (
    <div className="card">
      <h2 className="subtitle">{a.clinic.name}</h2>
      <p>{a.clinic.address}</p>
      <p className="strong">{formatDateTime(a.time)}</p>

      {/* Modify mode: a button that restarts the date/time screens for this appointment. */}
      {mode === 'modify' && (
        <button
          type="button"
          className="btn btn-filled"
          onClick={() => nav.push(<SelectDateScreen draft={new BookingDraft({ clinic: a.clinic, editing: a })} />)}
        >
          <Icon name="edit" size={20} /> Modify
        </button>
      )}

      {/* Cancel mode: a red button that asks "are you sure?" first. */}
      {mode === 'cancel' && (
        <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>
          <Icon name="xCircle" size={20} /> Cancel appointment
        </button>
      )}

      {confirming && (
        <Dialog
          title="Cancel this appointment?"
          onClose={() => setConfirming(false)}
          actions={
            <>
              <button type="button" className="btn btn-text" onClick={() => setConfirming(false)}>
                Keep it
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  appData.cancel(a);
                  onCancelled();
                }}
              >
                Yes, cancel
              </button>
            </>
          }
        >
          {a.clinic.name}
          <br />
          {formatDateTime(a.time)}
        </Dialog>
      )}
    </div>
  );
}

// ============================================================
// 6. NOTIFICATIONS (opened by the bell icon) AND PLACEHOLDER PAGES
// ============================================================

export function NotificationsScreen() {
  const data = useAppData();
  const list = data.sortedNotifications; // newest first
  return (
    <FlowPage title="Notifications">
      {list.length === 0 && <p>No notifications yet.</p>}
      {list.map((n) => (
        // Tapping a notification marks it as read. Unread ones are bold and have a dot.
        <button key={n.id} type="button" className={'card notif' + (n.read ? '' : ' unread')} onClick={() => appData.markRead(n)}>
          <Icon name={notifIcon(n.type)} />
          <span className="notif-text">
            <span className="notif-title">{notifMessage(n.type)}</span>
            <span className="muted">{formatDateTime(n.time)}</span>
          </span>
          {!n.read && <span className="dot" aria-label="unread" />}
        </button>
      ))}
    </FlowPage>
  );
}

// Stand-in for pages that have no sketch yet (Profile, Settings).
export function ComingSoonScreen({ title, icon }) {
  return (
    <FlowPage title={title}>
      <div className="card notif">
        <Icon name={icon} />
        <span className="notif-text">
          <span className="notif-title">{title}</span>
          <span className="muted">This page has not been designed yet.</span>
        </span>
      </div>
    </FlowPage>
  );
}
