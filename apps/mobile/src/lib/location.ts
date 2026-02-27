import * as Location from 'expo-location';

export type GeoResult = {
  lat: number;
  lng: number;
  accuracy?: number;
  status: 'ok' | 'denied' | 'unavailable' | 'timeout';
  captured_at: string;
};

export async function getCurrentLocation(timeoutMs = 10000): Promise<GeoResult> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      return {
        lat: 0,
        lng: 0,
        status: 'denied',
        captured_at: new Date().toISOString(),
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    clearTimeout(timeout);

    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      accuracy: location.coords.accuracy ?? undefined,
      status: 'ok',
      captured_at: new Date().toISOString(),
    };
  } catch (err) {
    const status =
      (err as Error).name === 'AbortError' ? 'timeout' : 'unavailable';
    return {
      lat: 0,
      lng: 0,
      status,
      captured_at: new Date().toISOString(),
    };
  }
}
