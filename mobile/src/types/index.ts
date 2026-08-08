export interface FileEntry {
  name: string;
  path: string; // root-relative, forward-slashed
  isDir: boolean;
  size: number;
  modTime: string;
  mode: string;
}

export interface ListResponse {
  path: string;
  entries: FileEntry[];
}

export interface ServerSettings {
  baseUrl: string; // e.g. http://100.x.x.x:8080  (your Tailscale IP)
  apiKey: string;
}

/** A saved connection to one Linux backend ("minilab"). */
export interface DeviceProfile {
  id: string;
  name: string; // friendly label, e.g. "Laptop Kamar"
  baseUrl: string; // e.g. http://100.x.x.x:8080  (Tailscale IP + port)
  apiKey: string;
}

/**
 * The pairing code is what a non-technical user pastes into the app to
 * add a device. It's just base64(JSON) of these three fields, generated
 * by the backend's install script — no manual typing of IP/API key needed.
 */
export interface PairingPayload {
  name: string;
  baseUrl: string;
  apiKey: string;
}
