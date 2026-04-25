export type AuthMode = "oauth2" | "service-account";

export interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  [key: string]: unknown;
}

export interface NormalizedConfig {
  mode: AuthMode;
  scopes: string[];
  defaultCalendarId: string;
  oauth2?: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    redirectUri: string;
  };
  serviceAccount?: {
    key: ServiceAccountKey;
    subject?: string;
  };
}

const DEFAULT_SCOPES = ["https://www.googleapis.com/auth/calendar"];
const DEFAULT_REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob";

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`google-calendar plugin: config.${field} must be a non-empty string`);
  }
  return value;
}

function parseServiceAccountKey(raw: unknown): ServiceAccountKey {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error(
        `google-calendar plugin: auth.serviceAccountKey was a string but not valid JSON: ${(err as Error).message}`,
      );
    }
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("google-calendar plugin: auth.serviceAccountKey must be an object or JSON string");
  }
  const key = parsed as Partial<ServiceAccountKey>;
  if (typeof key.client_email !== "string" || typeof key.private_key !== "string") {
    throw new Error(
      "google-calendar plugin: auth.serviceAccountKey is missing required fields (client_email, private_key)",
    );
  }
  return key as ServiceAccountKey;
}

export function normalizeConfig(pluginConfig: Record<string, unknown> | undefined): NormalizedConfig {
  const cfg = pluginConfig ?? {};
  const auth = (cfg.auth ?? {}) as Record<string, unknown>;
  const scopes = Array.isArray(auth.scopes) && auth.scopes.length > 0
    ? auth.scopes.map((s) => String(s))
    : DEFAULT_SCOPES;
  const defaultCalendarId = typeof cfg.defaultCalendarId === "string" && cfg.defaultCalendarId.length > 0
    ? cfg.defaultCalendarId
    : "primary";

  const declaredMode = auth.mode as AuthMode | undefined;
  const inferredMode: AuthMode = declaredMode
    ?? (auth.serviceAccountKey ? "service-account" : "oauth2");

  if (inferredMode === "service-account") {
    return {
      mode: "service-account",
      scopes,
      defaultCalendarId,
      serviceAccount: {
        key: parseServiceAccountKey(auth.serviceAccountKey),
        subject: typeof auth.subject === "string" ? auth.subject : undefined,
      },
    };
  }

  return {
    mode: "oauth2",
    scopes,
    defaultCalendarId,
    oauth2: {
      clientId: asString(auth.clientId, "auth.clientId"),
      clientSecret: asString(auth.clientSecret, "auth.clientSecret"),
      refreshToken: asString(auth.refreshToken, "auth.refreshToken"),
      redirectUri: typeof auth.redirectUri === "string" && auth.redirectUri.length > 0
        ? auth.redirectUri
        : DEFAULT_REDIRECT_URI,
    },
  };
}
