import { fetch as expoFetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { ApiError, apiUrl, authHeader, toApiError } from './api';

/** A picked photo or document (expo-image-picker / expo-document-picker asset). */
export interface PickedFile {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
  /** Web only: the browser File. */
  file?: Blob | null;
}

/**
 * Multipart upload of a picked file. Native uses expo/fetch with an
 * expo-file-system File (a Blob backed by the local file); the web preview
 * uses the browser File.
 */
export async function uploadFile<T = unknown>(path: string, field: string, picked: PickedFile, extra: Record<string, string> = {}): Promise<T> {
  const form = new FormData();
  for (const [k, v] of Object.entries(extra)) form.append(k, v);

  if (Platform.OS === 'web') {
    const blob = picked.file ?? (await (await globalThis.fetch(picked.uri)).blob());
    form.append(field, blob, picked.name ?? 'upload');
    const res = await globalThis.fetch(apiUrl(path), { method: 'POST', body: form, headers: { Accept: 'application/json', ...authHeader() } });
    if (!res.ok) throw await toApiError(res);
    return (await res.json()) as T;
  }

  form.append(field, new File(picked.uri) as unknown as Blob, picked.name ?? undefined);
  let res;
  try {
    res = await expoFetch(apiUrl(path), { method: 'POST', body: form, headers: { Accept: 'application/json', ...authHeader() } });
  } catch {
    throw new ApiError(0, 'Upload failed. Check your connection and try again.');
  }
  if (!res.ok) throw await toApiError(res as unknown as Response);
  return (await res.json()) as T;
}

/**
 * Download an authenticated file (invoice PDF, payslip, patient document)
 * and hand it to the system viewer / share sheet.
 */
export async function openRemoteFile(path: string, fileName: string, mimeType = 'application/pdf'): Promise<void> {
  if (Platform.OS === 'web') {
    const res = await globalThis.fetch(apiUrl(path), { headers: authHeader() });
    if (!res.ok) throw await toApiError(res);
    const url = URL.createObjectURL(await res.blob());
    globalThis.open?.(url, '_blank');
    return;
  }

  const res = await expoFetch(apiUrl(path), { headers: { Accept: mimeType, ...authHeader() } });
  if (!res.ok) throw await toApiError(res as unknown as Response);
  const safe = fileName.replace(/[^\w.\-]+/g, '_');
  const file = new File(Paths.cache, safe);
  if (file.exists) file.delete();
  file.create();
  file.write(await res.bytes());

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: fileName });
  } else {
    throw new ApiError(0, 'No app available to open this file.');
  }
}
