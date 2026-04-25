import { Type } from "@sinclair/typebox";
import type { calendar_v3 } from "googleapis";
import type { CalendarClientFactory } from "../client.js";
import { jsonResult, textResult } from "../format.js";
import type { ToolDef } from "./calendars.js";

const EventDateTime = Type.Object(
  {
    dateTime: Type.Optional(
      Type.String({
        description: "RFC3339 timestamp with offset, e.g. '2026-05-01T15:00:00-07:00'. Use this for timed events.",
      }),
    ),
    date: Type.Optional(
      Type.String({
        description: "YYYY-MM-DD for all-day events. Mutually exclusive with dateTime.",
      }),
    ),
    timeZone: Type.Optional(
      Type.String({ description: "IANA time zone (e.g. 'America/Los_Angeles'). Required when ambiguous." }),
    ),
  },
  { description: "Either dateTime (timed) or date (all-day) must be provided." },
);

const Attendee = Type.Object({
  email: Type.String(),
  displayName: Type.Optional(Type.String()),
  optional: Type.Optional(Type.Boolean()),
  responseStatus: Type.Optional(
    Type.Union([
      Type.Literal("needsAction"),
      Type.Literal("declined"),
      Type.Literal("tentative"),
      Type.Literal("accepted"),
    ]),
  ),
});

const SendUpdates = Type.Union([Type.Literal("all"), Type.Literal("externalOnly"), Type.Literal("none")]);
const Visibility = Type.Union([
  Type.Literal("default"),
  Type.Literal("public"),
  Type.Literal("private"),
  Type.Literal("confidential"),
]);

function asRecord(params: unknown): Record<string, unknown> {
  return (params ?? {}) as Record<string, unknown>;
}

function summarizeEvent(e: calendar_v3.Schema$Event) {
  return {
    id: e.id,
    status: e.status,
    htmlLink: e.htmlLink,
    summary: e.summary,
    description: e.description,
    location: e.location,
    start: e.start,
    end: e.end,
    organizer: e.organizer,
    creator: e.creator,
    attendees: e.attendees,
    recurrence: e.recurrence,
    recurringEventId: e.recurringEventId,
    hangoutLink: e.hangoutLink,
    conferenceData: e.conferenceData,
    updated: e.updated,
  };
}

export function eventTools(factory: CalendarClientFactory): ToolDef[] {
  return [
    {
      name: "gcal_list_events",
      label: "Google Calendar — list events",
      description:
        "List events from a calendar. Supports time-window filtering, free-text search, single-event expansion of recurrences, and pagination.",
      parameters: Type.Object({
        calendarId: Type.Optional(Type.String()),
        q: Type.Optional(Type.String({ description: "Free-text search across summary/description/location." })),
        timeMin: Type.Optional(Type.String({ description: "RFC3339 lower bound (inclusive) on event end time." })),
        timeMax: Type.Optional(Type.String({ description: "RFC3339 upper bound (exclusive) on event start time." })),
        timeZone: Type.Optional(Type.String()),
        singleEvents: Type.Optional(
          Type.Boolean({ description: "Expand recurring events into instances. Defaults to true." }),
        ),
        orderBy: Type.Optional(Type.Union([Type.Literal("startTime"), Type.Literal("updated")])),
        maxResults: Type.Optional(Type.Integer({ minimum: 1, maximum: 2500 })),
        pageToken: Type.Optional(Type.String()),
        showDeleted: Type.Optional(Type.Boolean()),
        updatedMin: Type.Optional(Type.String({ description: "RFC3339 timestamp; events updated at or after." })),
      }),
      async execute(_id, params) {
        const p = asRecord(params);
        const calendarId = (p.calendarId as string | undefined) ?? factory.defaultCalendarId;
        const res = await factory.client().events.list({
          calendarId,
          q: p.q as string | undefined,
          timeMin: p.timeMin as string | undefined,
          timeMax: p.timeMax as string | undefined,
          timeZone: p.timeZone as string | undefined,
          singleEvents: (p.singleEvents as boolean | undefined) ?? true,
          orderBy: p.orderBy as "startTime" | "updated" | undefined,
          maxResults: p.maxResults as number | undefined,
          pageToken: p.pageToken as string | undefined,
          showDeleted: p.showDeleted as boolean | undefined,
          updatedMin: p.updatedMin as string | undefined,
        });
        return jsonResult({
          calendarId,
          items: (res.data.items ?? []).map(summarizeEvent),
          nextPageToken: res.data.nextPageToken ?? null,
          nextSyncToken: res.data.nextSyncToken ?? null,
        });
      },
    },
    {
      name: "gcal_get_event",
      label: "Google Calendar — get event",
      description: "Fetch a single event by id.",
      parameters: Type.Object({
        eventId: Type.String(),
        calendarId: Type.Optional(Type.String()),
      }),
      async execute(_id, params) {
        const p = asRecord(params);
        const calendarId = (p.calendarId as string | undefined) ?? factory.defaultCalendarId;
        const res = await factory.client().events.get({
          calendarId,
          eventId: p.eventId as string,
        });
        return jsonResult(summarizeEvent(res.data));
      },
    },
    {
      name: "gcal_create_event",
      label: "Google Calendar — create event",
      description:
        "Create a new event. Provide start/end as either { dateTime, timeZone } for timed events or { date } for all-day events.",
      parameters: Type.Object({
        calendarId: Type.Optional(Type.String()),
        summary: Type.String(),
        description: Type.Optional(Type.String()),
        location: Type.Optional(Type.String()),
        start: EventDateTime,
        end: EventDateTime,
        attendees: Type.Optional(Type.Array(Attendee)),
        recurrence: Type.Optional(
          Type.Array(Type.String(), {
            description: "RRULE/RDATE/EXDATE strings, e.g. ['RRULE:FREQ=WEEKLY;BYDAY=MO']",
          }),
        ),
        sendUpdates: Type.Optional(SendUpdates),
        conferenceDataVersion: Type.Optional(Type.Integer({ minimum: 0, maximum: 1 })),
        addGoogleMeet: Type.Optional(
          Type.Boolean({ description: "If true, attaches a Google Meet conference. Sets conferenceDataVersion=1." }),
        ),
        colorId: Type.Optional(Type.String()),
        visibility: Type.Optional(Visibility),
      }),
      async execute(_id, params) {
        const p = asRecord(params);
        const calendarId = (p.calendarId as string | undefined) ?? factory.defaultCalendarId;
        const requestBody: calendar_v3.Schema$Event = {
          summary: p.summary as string,
          description: p.description as string | undefined,
          location: p.location as string | undefined,
          start: p.start as calendar_v3.Schema$EventDateTime,
          end: p.end as calendar_v3.Schema$EventDateTime,
          attendees: p.attendees as calendar_v3.Schema$EventAttendee[] | undefined,
          recurrence: p.recurrence as string[] | undefined,
          colorId: p.colorId as string | undefined,
          visibility: p.visibility as string | undefined,
        };
        let conferenceDataVersion = p.conferenceDataVersion as number | undefined;
        if (p.addGoogleMeet) {
          conferenceDataVersion = 1;
          requestBody.conferenceData = {
            createRequest: {
              requestId: `gcal-plugin-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          };
        }
        const res = await factory.client().events.insert({
          calendarId,
          sendUpdates: p.sendUpdates as "all" | "externalOnly" | "none" | undefined,
          conferenceDataVersion,
          requestBody,
        });
        return jsonResult(summarizeEvent(res.data));
      },
    },
    {
      name: "gcal_update_event",
      label: "Google Calendar — update event",
      description: "Patch an existing event. Only the fields you supply are updated.",
      parameters: Type.Object({
        eventId: Type.String(),
        calendarId: Type.Optional(Type.String()),
        summary: Type.Optional(Type.String()),
        description: Type.Optional(Type.String()),
        location: Type.Optional(Type.String()),
        start: Type.Optional(EventDateTime),
        end: Type.Optional(EventDateTime),
        attendees: Type.Optional(Type.Array(Attendee)),
        recurrence: Type.Optional(Type.Array(Type.String())),
        colorId: Type.Optional(Type.String()),
        visibility: Type.Optional(Visibility),
        sendUpdates: Type.Optional(SendUpdates),
      }),
      async execute(_id, params) {
        const p = asRecord(params);
        const calendarId = (p.calendarId as string | undefined) ?? factory.defaultCalendarId;
        const requestBody: calendar_v3.Schema$Event = {};
        for (const k of ["summary", "description", "location", "colorId", "visibility"] as const) {
          if (p[k] !== undefined) (requestBody as Record<string, unknown>)[k] = p[k];
        }
        if (p.start !== undefined) requestBody.start = p.start as calendar_v3.Schema$EventDateTime;
        if (p.end !== undefined) requestBody.end = p.end as calendar_v3.Schema$EventDateTime;
        if (p.attendees !== undefined) {
          requestBody.attendees = p.attendees as calendar_v3.Schema$EventAttendee[];
        }
        if (p.recurrence !== undefined) requestBody.recurrence = p.recurrence as string[];

        const res = await factory.client().events.patch({
          calendarId,
          eventId: p.eventId as string,
          sendUpdates: p.sendUpdates as "all" | "externalOnly" | "none" | undefined,
          requestBody,
        });
        return jsonResult(summarizeEvent(res.data));
      },
    },
    {
      name: "gcal_delete_event",
      label: "Google Calendar — delete event",
      description: "Delete an event by id.",
      parameters: Type.Object({
        eventId: Type.String(),
        calendarId: Type.Optional(Type.String()),
        sendUpdates: Type.Optional(SendUpdates),
      }),
      async execute(_id, params) {
        const p = asRecord(params);
        const calendarId = (p.calendarId as string | undefined) ?? factory.defaultCalendarId;
        const eventId = p.eventId as string;
        await factory.client().events.delete({
          calendarId,
          eventId,
          sendUpdates: p.sendUpdates as "all" | "externalOnly" | "none" | undefined,
        });
        return textResult(`Deleted event ${eventId} from calendar ${calendarId}.`, {
          deleted: true,
          eventId,
          calendarId,
        });
      },
    },
    {
      name: "gcal_move_event",
      label: "Google Calendar — move event",
      description: "Move an event to a different calendar. Returns the moved event.",
      parameters: Type.Object({
        eventId: Type.String(),
        destinationCalendarId: Type.String(),
        calendarId: Type.Optional(Type.String({ description: "Source calendar id." })),
        sendUpdates: Type.Optional(SendUpdates),
      }),
      async execute(_id, params) {
        const p = asRecord(params);
        const calendarId = (p.calendarId as string | undefined) ?? factory.defaultCalendarId;
        const res = await factory.client().events.move({
          calendarId,
          eventId: p.eventId as string,
          destination: p.destinationCalendarId as string,
          sendUpdates: p.sendUpdates as "all" | "externalOnly" | "none" | undefined,
        });
        return jsonResult(summarizeEvent(res.data));
      },
    },
    {
      name: "gcal_quick_add",
      label: "Google Calendar — quick add",
      description:
        "Create an event from a natural-language string (e.g. 'Lunch with Sam tomorrow at noon'). Uses Google's quickAdd parser.",
      parameters: Type.Object({
        text: Type.String(),
        calendarId: Type.Optional(Type.String()),
        sendUpdates: Type.Optional(SendUpdates),
      }),
      async execute(_id, params) {
        const p = asRecord(params);
        const calendarId = (p.calendarId as string | undefined) ?? factory.defaultCalendarId;
        const res = await factory.client().events.quickAdd({
          calendarId,
          text: p.text as string,
          sendUpdates: p.sendUpdates as "all" | "externalOnly" | "none" | undefined,
        });
        return jsonResult(summarizeEvent(res.data));
      },
    },
  ];
}
