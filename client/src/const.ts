export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const LOGIN_FALLBACK_PATH = "/";

const normalizeBaseUrl = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
};

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  if (typeof window === "undefined") {
    return LOGIN_FALLBACK_PATH;
  }

  const oauthPortalUrl = normalizeBaseUrl(import.meta.env.VITE_OAUTH_PORTAL_URL);
  const appId = import.meta.env.VITE_APP_ID?.trim();
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  if (!oauthPortalUrl || !appId) {
    console.warn(
      "[Auth] Missing OAuth client configuration. Falling back to root page."
    );
    return LOGIN_FALLBACK_PATH;
  }

  try {
    const url = new URL("app-auth", oauthPortalUrl);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");

    return url.toString();
  } catch (error) {
    console.error("[Auth] Failed to construct login URL", error);
    return LOGIN_FALLBACK_PATH;
  }
};
