// DATA: the information the screens show and change.
//
// Everything here is SAMPLE DATA kept in memory. When your database is ready
// (Firebase / Supabase), this is the file you replace: the screens only talk to
// `appData`, they never create clinics or appointments themselves.

import { useSyncExternalStore } from 'react';

// ------------------------------------------------------------
// 1. CLINICS (your two sketches used different lists, so this merges them)
// ------------------------------------------------------------
export const sampleClinics = [
  { name: 'Riverside Clinic', address: '123 River St', phone: '(123) 456-7890', km: 1.8, nextAvailable: 'Today 2pm', familyMedicine: true, availableToday: true },
  { name: 'Downtown Clinic', address: '125 King St', phone: '(123) 456-7891', km: 3, nextAvailable: 'Tomorrow 9am', familyMedicine: true, availableToday: false },
  { name: 'Rideau Clinic', address: '468 Rideau St', phone: '(123) 456-7892', km: 4, nextAvailable: 'Today 4pm', familyMedicine: true, availableToday: true },
  { name: 'Greenview Clinic', address: '45 Park Ave', phone: '(123) 456-7893', km: 4, nextAvailable: 'Tomorrow 10am', familyMedicine: true, availableToday: false },
  { name: 'West Clinic', address: '799 West St', phone: '(123) 456-7894', km: 5, nextAvailable: 'Today 6pm', familyMedicine: true, availableToday: true },
  { name: 'Westside Clinic', address: '323 West St', phone: '(123) 456-7895', km: 6, nextAvailable: 'Tomorrow 1pm', familyMedicine: true, availableToday: false },
];

// The appointment times offered each day (from your "Available Times" sketch).
export const bookingTimes = [
  { hour: 9, minute: 0 },
  { hour: 10, minute: 15 },
  { hour: 13, minute: 30 },
  { hour: 15, minute: 0 },
];

// ------------------------------------------------------------
// 2. NOTIFICATION TEXT AND ICONS
//    Messages are generic on purpose (no health details), as in your concept.
// ------------------------------------------------------------
const NOTIF_MESSAGES = {
  booked: 'Your appointment is booked.',
  cancelled: 'Your appointment was cancelled.',
  rescheduled: 'Your appointment time was changed.',
  reminder: 'Reminder: you have an upcoming appointment.',
};
const NOTIF_ICONS = {
  booked: 'calendarCheck',
  cancelled: 'calendarX',
  rescheduled: 'edit',
  reminder: 'clock',
};
export const notifMessage = (type) => NOTIF_MESSAGES[type];
export const notifIcon = (type) => NOTIF_ICONS[type];

// ------------------------------------------------------------
// 3. BOOKING DRAFT
//    Remembers the choices made while moving through the booking screens
//    (clinic -> date -> time -> review). If `editing` is set, the user is
//    modifying that existing appointment instead of making a new one.
// ------------------------------------------------------------
export class BookingDraft {
  constructor({ clinic = null, editing = null } = {}) {
    this.clinic = clinic;
    this.date = null;
    this.time = null; // date AND time of day together
    this.editing = editing;
  }
}

// ------------------------------------------------------------
// 4. APP DATA: the one place that stores and changes everything.
//    Screens "subscribe" to it. When it changes, every subscribed screen redraws.
// ------------------------------------------------------------
class AppData {
  constructor() {
    this.appointments = [];
    this.notifications = [];
    this.nextId = 1;
    this.version = 0; // goes up by 1 on every change, so React knows to redraw
    this.listeners = new Set();

    // One sample appointment and one reminder so the app is not empty at first.
    const now = new Date();
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3);
    this.appointments.push({
      id: this.nextId++,
      clinic: sampleClinics[3],
      time: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 10, 15),
    });
    this.notifications.push({
      id: this.nextId++,
      type: 'reminder',
      time: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      read: false,
    });
  }

  // --- subscription (used by the useAppData hook below) ---
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getSnapshot = () => this.version;
  notify() {
    this.version++;
    this.listeners.forEach((l) => l()); // tell every screen to redraw
  }

  // Appointments, soonest first.
  get upcoming() {
    return [...this.appointments].sort((a, b) => a.time - b.time);
  }

  // Notifications, newest first.
  get sortedNotifications() {
    return [...this.notifications].sort((a, b) => b.time - a.time);
  }

  get unreadCount() {
    return this.notifications.filter((n) => !n.read).length;
  }

  // Is this clinic already booked at this time? (Prevents double booking.)
  // `ignore` = the appointment being modified, which may keep its own slot.
  isTaken(clinic, time, ignore = null) {
    return this.appointments.some(
      (a) => a !== ignore && a.clinic === clinic && a.time.getTime() === time.getTime()
    );
  }

  addNotification(type) {
    this.notifications.push({ id: this.nextId++, type, time: new Date(), read: false });
  }

  book(clinic, time) {
    this.appointments.push({ id: this.nextId++, clinic, time });
    this.addNotification('booked');
    this.notify();
  }

  reschedule(appointment, time) {
    appointment.time = time;
    this.addNotification('rescheduled');
    this.notify();
  }

  cancel(appointment) {
    this.appointments = this.appointments.filter((a) => a !== appointment);
    this.addNotification('cancelled');
    this.notify();
  }

  markRead(notification) {
    notification.read = true;
    this.notify();
  }
}

// The single shared instance every screen uses.
export const appData = new AppData();

// Screens call this hook to read appData AND redraw automatically when it changes.
export function useAppData() {
  useSyncExternalStore(appData.subscribe, appData.getSnapshot);
  return appData;
}

// ------------------------------------------------------------
// 5. TEXT FORMATTING HELPERS (so dates look like "Thursday, Oct 22, 2026")
// ------------------------------------------------------------
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatDate = (d) => `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

export function formatTime(d) {
  const hour = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${hour}:${minute} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

export const formatDateTime = (d) => `${formatDate(d)} · ${formatTime(d)}`;

// 4 -> "4 km", 1.8 -> "1.8 km"
export const formatKm = (km) => `${km} km`;
