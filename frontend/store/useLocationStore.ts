import { create } from 'zustand';
import * as Location from 'expo-location';

type Coordinates = {
  latitude: number;
  longitude: number;
};

let pendingLocationRequest: Promise<Coordinates | null> | null = null;
let locationSubscription: Location.LocationSubscription | null = null;

const stopLocationWatch = () => {
  if (!locationSubscription) {
    return;
  }

  locationSubscription.remove();
  locationSubscription = null;
};

const startLocationWatch = async (
  set: (partial: Partial<LocationState>) => void,
  get: () => LocationState
) => {
  if (locationSubscription) {
    return;
  }

  locationSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 15000,
      distanceInterval: 25,
    },
    (position) => {
      const nextCoords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      const existingCoords = get().coords;
      if (
        existingCoords &&
        existingCoords.latitude === nextCoords.latitude &&
        existingCoords.longitude === nextCoords.longitude
      ) {
        return;
      }

      set({ coords: nextCoords, locationPermissionDenied: false });
    }
  );
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

    if (pendingLocationRequest) {
      return pendingLocationRequest;
    }

    pendingLocationRequest = (async () => {
      set({ isLocationLoading: true, locationPermissionDenied: false });

      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          stopLocationWatch();
          set({ coords: null, locationPermissionDenied: true });
          return null;
        }

        await startLocationWatch(set, get);

        // Reuse cached GPS across tabs unless caller explicitly asks to refresh.
        if (!force && existingCoords) {
          return existingCoords;
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
        stopLocationWatch();
        set({ coords: null });
        return null;
      } finally {
        set({ isLocationLoading: false });
        pendingLocationRequest = null;
      }
    })();

    return pendingLocationRequest;
  },
}));
