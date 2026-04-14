import { create } from 'zustand';
import * as Location from 'expo-location';

type Coordinates = {
  latitude: number;
  longitude: number;
};

interface LocationState {
  coords: Coordinates | null;
  isLocationLoading: boolean;
  locationPermissionDenied: boolean;
  ensureLocation: (options?: { force?: boolean }) => Promise<Coordinates | null>;
}

export const useLocationStore = create<LocationState>()((set, get) => ({
  coords: null,
  isLocationLoading: false,
  locationPermissionDenied: false,

  ensureLocation: async (options) => {
    const force = options?.force ?? false;
    const existingCoords = get().coords;

    // Reuse cached GPS across tabs unless caller explicitly asks to refresh.
    if (!force && existingCoords) {
      return existingCoords;
    }

    set({ isLocationLoading: true, locationPermissionDenied: false });

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        set({ coords: null, locationPermissionDenied: true });
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const nextCoords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      set({ coords: nextCoords, locationPermissionDenied: false });
      return nextCoords;
    } catch {
      set({ coords: null });
      return null;
    } finally {
      set({ isLocationLoading: false });
    }
  },
}));
