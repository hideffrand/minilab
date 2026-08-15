import { AxiosInstance } from "axios";
import * as FileSystem from "expo-file-system/legacy";
import { ListResponse } from "../types";

export async function listFiles(
  client: AxiosInstance,
  path: string
): Promise<ListResponse> {
  const res = await client.get<ListResponse>("/api/files/list", {
    params: { path },
  });
  return res.data;
}

export async function mkdir(client: AxiosInstance, path: string) {
  await client.post("/api/files/mkdir", { path });
}

export async function rename(
  client: AxiosInstance,
  oldPath: string,
  newPath: string
) {
  await client.post("/api/files/rename", { oldPath, newPath });
}

export async function copyItem(
  client: AxiosInstance,
  src: string,
  dst: string
) {
  await client.post("/api/files/copy", { src, dst });
}

export async function moveItem(
  client: AxiosInstance,
  src: string,
  dst: string
) {
  await client.post("/api/files/move", { src, dst });
}

export async function deleteItem(client: AxiosInstance, path: string) {
  await client.delete("/api/files/delete", { data: { path } });
}

export type UploadProgressCallback = (bytesSent: number, totalBytes: number) => void;

/**
 * Uploads a local file (picked via expo-document-picker) into `destDir`
 * on the server using multipart/form-data.
 *
 * Uses expo-file-system's createUploadTask (rather than uploadAsync) because
 * only the task variant exposes a progress callback — needed to drive
 * per-file progress bars in the UI. Returns an object with an `uploadAsync`
 * to kick things off and a `cancel` to abort mid-flight if ever needed.
 */
export function createFileUpload(
  baseUrl: string,
  apiKey: string,
  destDir: string,
  localUri: string,
  onProgress?: UploadProgressCallback
) {
  const url = `${baseUrl}/api/files/upload`;
  const task = FileSystem.createUploadTask(
    url,
    localUri,
    {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "file",
      parameters: { path: destDir },
      headers: { "X-API-Key": apiKey },
    },
    onProgress
      ? (data) => onProgress(data.totalBytesSent, data.totalBytesExpectedToSend)
      : undefined
  );

  return {
    uploadAsync: async (): Promise<void> => {
      const result = await task.uploadAsync();
      if (!result || result.status < 200 || result.status >= 300) {
        throw new Error(`Upload failed (${result?.status}): ${result?.body ?? "no response"}`);
      }
    },
    cancel: () => task.cancelAsync(),
  };
}

/** Convenience wrapper for a single fire-and-await upload with progress. */
export async function uploadFile(
  baseUrl: string,
  apiKey: string,
  destDir: string,
  localUri: string,
  onProgress?: UploadProgressCallback
): Promise<void> {
  const { uploadAsync } = createFileUpload(baseUrl, apiKey, destDir, localUri, onProgress);
  await uploadAsync();
}

/**
 * Downloads a remote file into the device's document directory and
 * returns the local URI, ready to be shared via expo-sharing.
 */
export async function downloadFile(
  baseUrl: string,
  apiKey: string,
  remotePath: string,
  fileName: string
): Promise<string> {
  const url = `${baseUrl}/api/files/download?path=${encodeURIComponent(
    remotePath
  )}`;
  const localUri = `${FileSystem.documentDirectory}${fileName}`;
  const result = await FileSystem.downloadAsync(url, localUri, {
    headers: { "X-API-Key": apiKey },
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Download failed (${result.status})`);
  }
  return result.uri;
}