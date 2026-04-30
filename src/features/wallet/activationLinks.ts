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

function isActivationRoute(url: URL) {
  const hostOrPath = `${url.host}${url.pathname}`.replace(/^\/+/, "").toLowerCase();
  return hostOrPath === "activate";
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

  if (url.protocol !== "unifywallet:") {
    return { ok: false, error: "Activation link must use the unifywallet scheme." };
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
