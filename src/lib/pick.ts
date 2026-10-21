import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';
import type { PickedFile } from './files';

export type Source = 'camera' | 'library' | 'files';

/** Take a photo, pick from the gallery, or pick any document (PDF, Word, images). */
export async function pickFile(source: Source, opts: { square?: boolean } = {}): Promise<PickedFile | null> {
  if (source === 'files') {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return null;
    const a = res.assets[0];
    return { uri: a.uri, name: a.name, mimeType: a.mimeType ?? null, file: (a as { file?: Blob }).file ?? null };
  }

  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in Settings to take photos.');
      return null;
    }
  }

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8, allowsEditing: !!opts.square, ...(opts.square ? { aspect: [1, 1] as [number, number] } : {}) };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  const ext = (a.mimeType?.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
  return { uri: a.uri, name: a.fileName ?? `photo-${Date.now()}.${ext}`, mimeType: a.mimeType ?? 'image/jpeg', file: (a as { file?: Blob }).file ?? null };
}

/** Native action sheet (Alert) to choose where a file comes from. */
export function chooseSource(title: string, includeFiles: boolean, onPick: (s: Source) => void): void {
  if (Platform.OS === 'web') return onPick(includeFiles ? 'files' : 'library');
  Alert.alert(title, undefined, [
    { text: 'Take photo', onPress: () => onPick('camera') },
    { text: 'Choose from gallery', onPress: () => onPick('library') },
    ...(includeFiles ? [{ text: 'Choose a file (PDF, report)', onPress: () => onPick('files' as Source) }] : []),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}
