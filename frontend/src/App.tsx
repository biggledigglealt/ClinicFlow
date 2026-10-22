import './App.css'

function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">ClinicFlow</p>
          <h1>Appointment & clinic access</h1>
        </div>
        <button type="button" className="primary-button">
          Log in
        </button>
      </header>

      <section className="hero-panel">
        <div>
          <p className="eyebrow">Deliverable C / D</p>
          <h2>Simple scheduling for patients and front-desk staff</h2>
        </div>
        <span className="status-pill">Admin-first workflow</span>
      </section>

      <main className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <h3>Find clinic</h3>
          </div>

          <div className="clinic-search">
            <input type="text" value="Ottawa" readOnly aria-label="Search clinic" />
            <button type="button">Search</button>
          </div>

          <div className="clinic-list">
            <article className="clinic-card selected">
              <div>
                <h4>East Ottawa Health Hub</h4>
                <p>1.4 km away • Accepting new patients</p>
              </div>
              <span>Open</span>
            </article>

            <article className="clinic-card">
              <div>
                <h4>Downtown Family Clinic</h4>
                <p>3.2 km away • 2 openings this week</p>
              </div>
              <span>Book</span>
            </article>
          </div>
        </section>

        <aside className="panel">
          <div className="panel-header">
            <h3>Book appointment</h3>
          </div>

          <div className="booking-card">
            <p className="label">Selected time</p>
            <h4>Tue, Jun 6 • 10:30 AM</h4>
            <ul>
              <li>Provider: Dr. Chen</li>
              <li>Location: East Ottawa Health Hub</li>
              <li>Type: New patient intake</li>
            </ul>
            <button type="button" className="confirm-button">
              Confirm booking
            </button>
          </div>
        </aside>
      </main>

      <section className="bottom-grid">
        <article className="panel">
          <div className="panel-header">
            <h3>Accessibility settings</h3>
          </div>
          <ul className="feature-list">
            <li>English / French toggle</li>
            <li>Large text mode</li>
            <li>High contrast mode</li>
            <li>Text-to-speech support</li>
          </ul>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h3>Notifications</h3>
          </div>
          <ul className="feature-list">
            <li>Reminder sent 24 hours before visit</li>
            <li>Cancellation alert to patient</li>
            <li>Clinic announcement banner</li>
            <li>Audit log retained for system activity</li>
          </ul>
        </article>
      </section>
    </div>
  )
}

export default App
