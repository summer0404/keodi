import { create } from 'zustand';
import type { GetNearbyPlacesRequest, PlaceItem } from '@/types/api';

type NearbyRequestBase = Omit<GetNearbyPlacesRequest, 'page'>;

interface PlacesState {
  placesById: Record<string, PlaceItem>;
  lastNearbyParams: NearbyRequestBase | null;
  cacheNearbyPlaces: (places: PlaceItem[]) => void;
  upsertPlace: (place: PlaceItem) => void;
  setPlaceFavorite: (placeId: string, isFavorite: boolean) => void;
  setLastNearbyParams: (params: NearbyRequestBase) => void;
}

export const usePlacesStore = create<PlacesState>()((set) => ({
  placesById: {},
  lastNearbyParams: null,

  cacheNearbyPlaces: (places) => {
    if (!places.length) {
      return;
    }

    set((state) => {
      const nextMap = { ...state.placesById };
      for (const place of places) {
        nextMap[place.id] = place;
      }

      return { placesById: nextMap };
    });
  },

  upsertPlace: (place) =>
    set((state) => ({
      placesById: {
        ...state.placesById,
        [place.id]: place,
      },
    })),

  setPlaceFavorite: (placeId, isFavorite) =>
    set((state) => {
      const target = state.placesById[placeId];
      if (!target) {
        return state;
      }

      return {
        placesById: {
          ...state.placesById,
          [placeId]: {
            ...target,
            isFavorite,
          },
        },
      };
    }),

  setLastNearbyParams: (params) => set({ lastNearbyParams: params }),
}));
