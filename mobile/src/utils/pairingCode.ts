import { PairingPayload } from "../types";

// Prefix makes it easy to eyeball "yep that's a minilab pairing code" and
// lets us reject garbage input with a friendly error instead of a cryptic
// JSON parse failure.
const PREFIX = "MINILAB1:";

export function encodePairingCode(payload: PairingPayload): string {
  const json = JSON.stringify(payload);
  const b64 = base64Encode(json);
  return `${PREFIX}${b64}`;
}

export function decodePairingCode(code: string): PairingPayload {
  const trimmed = code.trim();
  if (!trimmed.startsWith(PREFIX)) {
    throw new Error(
      "Code not recognized. Make sure you paste the entire pairing code from the terminal, without truncation."
    );
  }
  const b64 = trimmed.slice(PREFIX.length);
  let json: string;
  try {
    json = base64Decode(b64);
  } catch {
    throw new Error("Pairing code is corrupted or incomplete.");
  }
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Pairing code is corrupted or incomplete.");
  }
  if (!parsed.baseUrl || !parsed.apiKey) {
    throw new Error("Pairing code is missing required information.");
  }
  return {
    name: parsed.name || "Minilab",
    baseUrl: String(parsed.baseUrl).replace(/\/+$/, ""),
    apiKey: String(parsed.apiKey),
  };
}

// React Native 0.74+ (Hermes) provides global btoa/atob. The unescape/
// encodeURIComponent dance keeps names with non-ASCII characters intact.
function base64Encode(str: string): string {
  return (globalThis as { btoa(s: string): string }).btoa(
    unescape(encodeURIComponent(str))
  );
}

function base64Decode(b64: string): string {
  return decodeURIComponent(escape((globalThis as { atob(s: string): string }).atob(b64)));
}
