import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PinnedGroupSessionState {
  pinnedSessionIds: string[];
  setPinnedSessionIds: (ids: string[]) => void;
  clearPinnedSessionIds: () => void;
  addPinnedSessionId: (sessionId: string) => void;
  removePinnedSessionId: (sessionId: string) => void;
  togglePinnedSessionId: (sessionId: string) => void;
  isPinned: (sessionId: string) => boolean;
}

export const usePinnedGroupSessionStore = create<PinnedGroupSessionState>()(
  persist(
    (set, get) => ({
      pinnedSessionIds: [],

      setPinnedSessionIds: (ids) => set({ pinnedSessionIds: ids }),

      clearPinnedSessionIds: () => set({ pinnedSessionIds: [] }),

      addPinnedSessionId: (sessionId) => {
        const current = get().pinnedSessionIds;
        if (!current.includes(sessionId)) {
          set({ pinnedSessionIds: [...current, sessionId] });
        }
      },

      removePinnedSessionId: (sessionId) => {
        const current = get().pinnedSessionIds;
        set({ pinnedSessionIds: current.filter((id) => id !== sessionId) });
      },

      togglePinnedSessionId: (sessionId) => {
        const current = get().pinnedSessionIds;
        if (current.includes(sessionId)) {
          set({ pinnedSessionIds: current.filter((id) => id !== sessionId) });
        } else {
          set({ pinnedSessionIds: [...current, sessionId] });
        }
      },

      isPinned: (sessionId) => get().pinnedSessionIds.includes(sessionId),
    }),
    {
      name: 'pinned-group-session',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
