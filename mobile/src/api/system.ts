import { AxiosInstance } from "axios";
import { SystemStats } from "../types";

export async function getSystemStats(client: AxiosInstance): Promise<SystemStats> {
  const res = await client.get<SystemStats>("/api/system/stats");
  return res.data;
}
