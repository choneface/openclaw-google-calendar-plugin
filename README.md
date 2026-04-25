# @choneface/openclaw-google-calendar-plugin

OpenClaw plugin for Google Calendar. Full CRUD over events, calendars, and free/busy
through the official [`googleapis`](https://www.npmjs.com/package/googleapis) SDK.

Plugin id: `google-calendar`.

## Tools

| Tool                  | Purpose                                                                  |
| --------------------- | ------------------------------------------------------------------------ |
| `gcal_list_calendars` | List the user's calendars                                                |
| `gcal_get_calendar`   | Fetch metadata for a single calendar                                     |
| `gcal_list_events`    | List events with time/text filters, recurrence expansion, and pagination |
| `gcal_get_event`      | Fetch a single event by id                                               |
| `gcal_create_event`   | Create a timed or all-day event (supports attendees, recurrence, Meet)   |
| `gcal_update_event`   | Patch any subset of fields on an existing event                          |
| `gcal_delete_event`   | Delete an event                                                          |
| `gcal_move_event`     | Move an event between calendars                                          |
| `gcal_quick_add`      | Create an event from a natural-language string                           |
| `gcal_freebusy`       | Free/busy query across one or more calendars                             |

## Install

```bash
openclaw plugins install @choneface/openclaw-google-calendar-plugin
```

## Configure

The plugin supports two auth modes. Pick **one**.

### Mode A — OAuth2 refresh token (single user)

```json5
{
  plugins: {
    entries: {
      "google-calendar": {
        config: {
          auth: {
            mode: "oauth2",
            clientId: "YOUR_CLIENT_ID.apps.googleusercontent.com",
            clientSecret: "YOUR_CLIENT_SECRET",
            refreshToken: "1//YOUR_LONG_LIVED_REFRESH_TOKEN",
            // optional, defaults to the OOB redirect:
            // redirectUri: "http://localhost:53682",
          },
          // optional, defaults to "primary":
          // defaultCalendarId: "primary",
        },
      },
    },
  },
}
```

To mint a refresh token, follow Google's [installed-app OAuth flow](https://developers.google.com/identity/protocols/oauth2/native-app)
or use [oauth2l](https://github.com/google/oauth2l):

```bash
oauth2l fetch --scope https://www.googleapis.com/auth/calendar \
  --credentials ./client_secret.json \
  --output_format refresh_token
```

### Mode B — Service account (workspaces / shared calendars)

```json5
{
  plugins: {
    entries: {
      "google-calendar": {
        config: {
          auth: {
            mode: "service-account",
            serviceAccountKey: { /* contents of key.json */ },
            // optional: domain-wide delegation impersonation target
            // subject: "user@yourdomain.com",
          },
        },
      },
    },
  },
}
```

`serviceAccountKey` may also be a stringified JSON blob (useful when piping through
env-var substitution).

### Scopes

Defaults to `https://www.googleapis.com/auth/calendar`. Override via `auth.scopes`
(array of scope URLs) if you want a tighter grant — e.g.
`["https://www.googleapis.com/auth/calendar.readonly"]` for a read-only deployment.

## Examples

```
list my calendars
what's on my calendar tomorrow
schedule "Coffee with Alex" tomorrow 10–10:30am at "Sightglass"
move event abc123 to calendar work@company.com
am I free Tuesday between 1pm and 4pm
```

## Build (contributors)

```bash
npm install
npm run build
```

## License

MIT
