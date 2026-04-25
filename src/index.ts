import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { CalendarClientFactory } from "./client.js";
import { normalizeConfig } from "./config.js";
import { calendarTools } from "./tools/calendars.js";
import { eventTools } from "./tools/events.js";
import { freebusyTools } from "./tools/freebusy.js";

export default definePluginEntry({
  id: "google-calendar",
  name: "Google Calendar",
  description:
    "Read and write Google Calendar events via the official googleapis SDK. Supports OAuth2 refresh tokens and service-account credentials.",
  register(api) {
    const config = normalizeConfig(api.pluginConfig);
    const factory = new CalendarClientFactory(config);

    const tools = [
      ...calendarTools(factory),
      ...eventTools(factory),
      ...freebusyTools(factory),
    ];

    for (const tool of tools) {
      api.registerTool(tool);
    }
  },
});
