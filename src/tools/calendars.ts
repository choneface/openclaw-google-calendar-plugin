import { Type, type TSchema } from "@sinclair/typebox";
import type { CalendarClientFactory } from "../client.js";
import { jsonResult, type ToolResult } from "../format.js";

export interface ToolDef {
  name: string;
  description: string;
  label: string;
  parameters: TSchema;
  execute(toolCallId: string, params: unknown): Promise<ToolResult>;
}

function asRecord(params: unknown): Record<string, unknown> {
  return (params ?? {}) as Record<string, unknown>;
}

export function calendarTools(factory: CalendarClientFactory): ToolDef[] {
  return [
    {
      name: "gcal_list_calendars",
      label: "Google Calendar — list calendars",
      description:
        "List calendars on the user's Google calendar list. Returns id, summary, accessRole, primary, timeZone for each entry.",
      parameters: Type.Object({
        maxResults: Type.Optional(
          Type.Integer({
            minimum: 1,
            maximum: 250,
            description: "Page size cap (1-250). Defaults to Google's default.",
          }),
        ),
        pageToken: Type.Optional(Type.String({ description: "Token from a prior page." })),
        showHidden: Type.Optional(Type.Boolean({ description: "Include hidden calendars." })),
      }),
      async execute(_id, params) {
        const p = asRecord(params);
        const res = await factory.client().calendarList.list({
          maxResults: p.maxResults as number | undefined,
          pageToken: p.pageToken as string | undefined,
          showHidden: p.showHidden as boolean | undefined,
        });
        const items = (res.data.items ?? []).map((c) => ({
          id: c.id,
          summary: c.summary,
          description: c.description,
          timeZone: c.timeZone,
          primary: c.primary ?? false,
          accessRole: c.accessRole,
          backgroundColor: c.backgroundColor,
        }));
        return jsonResult({ items, nextPageToken: res.data.nextPageToken ?? null });
      },
    },
    {
      name: "gcal_get_calendar",
      label: "Google Calendar — get calendar",
      description: "Get metadata for a single calendar by id.",
      parameters: Type.Object({
        calendarId: Type.Optional(
          Type.String({
            description: "Calendar id. Defaults to the plugin's defaultCalendarId (typically 'primary').",
          }),
        ),
      }),
      async execute(_id, params) {
        const p = asRecord(params);
        const calendarId = (p.calendarId as string | undefined) ?? factory.defaultCalendarId;
        const res = await factory.client().calendars.get({ calendarId });
        return jsonResult(res.data);
      },
    },
  ];
}
