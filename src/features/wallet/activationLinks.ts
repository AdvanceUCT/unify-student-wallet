export type ActivationLinkRequest =
  | {
      kind: "token";
      sourceUrl: string;
      token: string;
    }
  | {
      invitationUrl: string;
      kind: "oob";
      sourceUrl: string;
    };

export type ActivationLinkParseResult = { ok: true; data: ActivationLinkRequest } | { ok: false; error: string };

const customActivationScheme = "unifywallet:";
const devActivationHosts = new Set(["localhost", "127.0.0.1", "10.0.2.2"]);

function allowedActivationHosts() {
  const configured: string =
    process.env.EXPO_PUBLIC_UNIFY_ACTIVATION_HOSTS ?? process.env.EXPO_PUBLIC_UNIFY_ACTIVATION_HOST ?? "localhost,10.0.2.2";

  return new Set(
    configured
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isActivationRoute(url: URL) {
  if (url.protocol === customActivationScheme) {
    const hostOrPath = `${url.host}${url.pathname}`.replace(/^\/+/, "").toLowerCase();
    return hostOrPath === "activate";
  }

  return url.pathname.replace(/\/+$/, "").toLowerCase() === "/activate";
}

function isSupportedActivationUrl(url: URL) {
  if (url.protocol === customActivationScheme) {
    return true;
  }

  const hostname = url.hostname.toLowerCase();
  const allowedHosts = allowedActivationHosts();

  if (url.protocol === "https:" && allowedHosts.has(hostname)) {
    return true;
  }

  return url.protocol === "http:" && devActivationHosts.has(hostname) && allowedHosts.has(hostname);
}

function nonEmptyParam(url: URL, name: string) {
  const value = url.searchParams.get(name)?.trim();
  return value ? value : null;
}

export function parseActivationLink(rawUrl: string): ActivationLinkParseResult {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, error: "Activation link is not a valid URL." };
  }

  if (!isSupportedActivationUrl(url)) {
    return { ok: false, error: "Activation link must use the wallet scheme or an allowed admin activation URL." };
  }

  if (!isActivationRoute(url)) {
    return { ok: false, error: "Activation link must target the activate route." };
  }

  const token = nonEmptyParam(url, "token");
  const invitationUrl = nonEmptyParam(url, "oob");

  if (token && invitationUrl) {
    return { ok: false, error: "Activation link must contain either token or oob, not both." };
  }

  if (token) {
    return { ok: true, data: { kind: "token", sourceUrl: rawUrl, token } };
  }

  if (invitationUrl) {
    return { ok: true, data: { invitationUrl, kind: "oob", sourceUrl: rawUrl } };
  }

  return { ok: false, error: "Activation link is missing a token or out-of-band invitation." };
}
