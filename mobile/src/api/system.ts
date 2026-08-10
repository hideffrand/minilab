import { AxiosInstance } from "axios";
import { SystemStats } from "../types";

export async function getSystemStats(client: AxiosInstance): Promise<SystemStats> {
  const res = await client.get<SystemStats>("/api/system/stats");
  return res.data;
}

export type PowerAction = "reboot" | "shutdown";

export async function getConfirmToken(client: AxiosInstance): Promise<string> {
  const res = await client.post<{ token: string }>("/api/system/confirm-token");
  return res.data.token;
}

export async function powerAction(
  client: AxiosInstance,
  action: PowerAction,
  confirmToken: string
): Promise<void> {
  await client.post(`/api/system/${action}`, null, {
    headers: { "X-Confirm-Token": confirmToken },
  });
}
