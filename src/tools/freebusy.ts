import { Type } from "@sinclair/typebox";
import type { CalendarClientFactory } from "../client.js";
import { jsonResult } from "../format.js";
import type { ToolDef } from "./calendars.js";

function asRecord(params: unknown): Record<string, unknown> {
  return (params ?? {}) as Record<string, unknown>;
}

export function freebusyTools(factory: CalendarClientFactory): ToolDef[] {
  return [
    {
      name: "gcal_freebusy",
      label: "Google Calendar — free/busy",
      description:
        "Query free/busy information for one or more calendars in a time window. Returns busy intervals per calendar.",
      parameters: Type.Object({
        timeMin: Type.String({ description: "RFC3339 lower bound." }),
        timeMax: Type.String({ description: "RFC3339 upper bound." }),
        calendarIds: Type.Optional(
          Type.Array(Type.String(), {
            description: "Calendar ids to check. Defaults to [defaultCalendarId].",
          }),
        ),
        timeZone: Type.Optional(Type.String()),
      }),
      async execute(_id, params) {
        const p = asRecord(params);
        const ids =
          (p.calendarIds as string[] | undefined)?.length
            ? (p.calendarIds as string[])
            : [factory.defaultCalendarId];
        const res = await factory.client().freebusy.query({
          requestBody: {
            timeMin: p.timeMin as string,
            timeMax: p.timeMax as string,
            timeZone: p.timeZone as string | undefined,
            items: ids.map((id) => ({ id })),
          },
        });
        return jsonResult(res.data);
      },
    },
  ];
}
