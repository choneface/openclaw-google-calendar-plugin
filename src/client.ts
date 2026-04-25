import { google, type calendar_v3 } from "googleapis";
import { JWT, OAuth2Client } from "google-auth-library";
import type { NormalizedConfig } from "./config.js";

export type CalendarClient = calendar_v3.Calendar;

export class CalendarClientFactory {
  private cached: CalendarClient | undefined;

  constructor(private readonly config: NormalizedConfig) {}

  get defaultCalendarId(): string {
    return this.config.defaultCalendarId;
  }

  client(): CalendarClient {
    if (!this.cached) {
      this.cached = google.calendar({ version: "v3", auth: this.buildAuth() });
    }
    return this.cached;
  }

  private buildAuth(): OAuth2Client | JWT {
    if (this.config.mode === "service-account") {
      const sa = this.config.serviceAccount!;
      return new JWT({
        email: sa.key.client_email,
        key: sa.key.private_key,
        scopes: this.config.scopes,
        subject: sa.subject,
      });
    }

    const o = this.config.oauth2!;
    const client = new OAuth2Client(o.clientId, o.clientSecret, o.redirectUri);
    client.setCredentials({ refresh_token: o.refreshToken });
    return client;
  }
}
