async function createCalendarEvent(event) {
  if (!event || !event.required) return;

  const startDateTime = event.time
    ? `${event.date}T${event.time}:00`
    : `${event.date}T09:00:00`;

  await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary: event.title,
        start: { dateTime: startDateTime },
        end: { dateTime: startDateTime }
      })
    }
  );

  alert('📅 Event added to Google Calendar');
}
