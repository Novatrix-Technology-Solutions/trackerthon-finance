import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const getGoogleAuth = () => {
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    
    if (!calendarId) {
      throw new Error("Missing GOOGLE_CALENDAR_ID in credentials");
    }

    const auth = getGoogleAuth();
    const calendar = google.calendar({ version: 'v3', auth });
    
    let eventId = body.data?.calendar_event_id;

    if (body.action === 'delete') {
      if (eventId) {
        await calendar.events.delete({
          calendarId,
          eventId,
        });
      }
      return NextResponse.json({ success: true, message: 'Deleted cleanly from Google Calendar' });
    }

    // Prepare Event Payload
    let eventPayload: any = {};
    const currency = body.currency || '$';

    if (body.type === 'debt') {
      const debt = body.data;
      eventPayload = {
        summary: `Due: ${debt.creditor} Payment`,
        description: `Remaining: ${currency}${debt.remaining} | Principal: ${currency}${debt.principal}`,
        start: { date: debt.due_date },
        end: { date: debt.due_date }
      };
    } else if (body.type === 'recurring_payment') {
      const sub = body.data;
      eventPayload = {
        summary: `Bill: ${sub.subscription_name}`,
        description: `Amount: ${currency}${sub.amount} | Category: ${sub.category}`,
        start: { date: sub.next_billing_date },
        end: { date: sub.next_billing_date }
      };
      
      // Calculate Google Calendar Recurrence Rules (RRULE)
      if (sub.frequency === 'Monthly') eventPayload.recurrence = ['RRULE:FREQ=MONTHLY'];
      else if (sub.frequency === 'Weekly') eventPayload.recurrence = ['RRULE:FREQ=WEEKLY'];
      else if (sub.frequency === 'Yearly') eventPayload.recurrence = ['RRULE:FREQ=YEARLY'];
    }

    if (body.action === 'create') {
      const res = await calendar.events.insert({
        calendarId,
        requestBody: eventPayload
      });
      return NextResponse.json({ success: true, calendar_event_id: res.data.id });
    } else if (body.action === 'update') {
      if (eventId) {
        const res = await calendar.events.update({
          calendarId,
          eventId,
          requestBody: eventPayload
        });
        return NextResponse.json({ success: true, calendar_event_id: res.data.id });
      } else {
        // Fallback to Create if the user updates an event that previously failed to get an ID
        const res = await calendar.events.insert({
          calendarId,
          requestBody: eventPayload
        });
        return NextResponse.json({ success: true, calendar_event_id: res.data.id });
      }
    }
    
    return NextResponse.json({ success: false, error: 'Unknown action' });
  } catch (error: any) {
    console.error('Google Calendar Sync Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to sync to Google calendar', details: error.message }, { status: 500 });
  }
}
