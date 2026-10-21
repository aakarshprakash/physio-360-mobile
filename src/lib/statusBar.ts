import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';

/** Light status-bar icons while a screen with a dark header is focused. */
export function useLightStatusBar(): void {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light', true);
      return () => setStatusBarStyle('dark', true);
    }, []),
  );
}
