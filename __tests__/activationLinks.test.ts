import { parseActivationLink } from "@/src/features/wallet/activationLinks";

describe("activation link parsing", () => {
  it("accepts token activation links", () => {
    expect(parseActivationLink("unifywallet://activate?token=opaque-token")).toEqual({
      ok: true,
      data: {
        kind: "token",
        sourceUrl: "unifywallet://activate?token=opaque-token",
        token: "opaque-token",
      },
    });
  });

  it("accepts public admin activation links", () => {
    expect(parseActivationLink("https://localhost/activate?token=opaque-token")).toEqual({
      ok: true,
      data: {
        kind: "token",
        sourceUrl: "https://localhost/activate?token=opaque-token",
        token: "opaque-token",
      },
    });
  });

  it("accepts emulator localhost activation links during development", () => {
    expect(parseActivationLink("http://10.0.2.2:3000/activate?token=opaque-token")).toEqual({
      ok: true,
      data: {
        kind: "token",
        sourceUrl: "http://10.0.2.2:3000/activate?token=opaque-token",
        token: "opaque-token",
      },
    });
  });

  it("accepts out-of-band activation links", () => {
    const invitationUrl = "https://issuer.advanceuct.test/oob?oob=abc";
    const link = `unifywallet://activate?oob=${encodeURIComponent(invitationUrl)}`;

    expect(parseActivationLink(link)).toEqual({
      ok: true,
      data: {
        invitationUrl,
        kind: "oob",
        sourceUrl: link,
      },
    });
  });

  it("rejects malformed activation links", () => {
    expect(parseActivationLink("not-a-url")).toEqual({ ok: false, error: "Activation link is not a valid URL." });
    expect(parseActivationLink("https://example.test/activate?token=x")).toEqual({
      ok: false,
      error: "Activation link must use the wallet scheme or an allowed admin activation URL.",
    });
    expect(parseActivationLink("unifywallet://activate")).toEqual({
      ok: false,
      error: "Activation link is missing a token or out-of-band invitation.",
    });
    expect(parseActivationLink("unifywallet://activate?token=x&oob=y")).toEqual({
      ok: false,
      error: "Activation link must contain either token or oob, not both.",
    });
  });
});
