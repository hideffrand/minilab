import { AxiosInstance } from "axios";
import { SystemStats } from "../types";

export async function getSystemStats(client: AxiosInstance): Promise<SystemStats> {
  const res = await client.get<SystemStats>("/api/system/stats");
  return res.data;
}

export type PowerAction = "reboot" | "shutdown";

export async function powerAction(
  client: AxiosInstance,
  action: PowerAction
): Promise<void> {
  await client.post(`/api/system/${action}`);
}
