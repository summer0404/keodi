import { create } from 'zustand';
import { groupSessionsService } from '@/api/groupSessions';
import type { GroupSessionItem } from '@/types/api';

const DETAIL_BATCH_SIZE = 10;
const DEFAULT_LIST_TTL_MS = 15 * 1000;
const DEFAULT_DETAIL_TTL_MS = 15 * 1000;

let fetchListPromise: Promise<GroupSessionItem[]> | null = null;
const fetchDetailPromises = new Map<string, Promise<GroupSessionItem | null>>();

type FetchListOptions = {
  force?: boolean;
  silent?: boolean;
  ttlMs?: number;
  includeDetails?: boolean;
};

type FetchDetailOptions = {
  force?: boolean;
  ttlMs?: number;
};

interface GroupSessionState {
  sessionsById: Record<string, GroupSessionItem>;
  sessionIds: string[];
  listFetchedAt: number;
  detailFetchedAtById: Record<string, number>;
  isLoadingList: boolean;
  hasLoadedInitialData: boolean;
  isLoadingDetailById: Record<string, boolean>;

  fetchList: (options?: FetchListOptions) => Promise<GroupSessionItem[]>;
  fetchSessionById: (
    sessionId: string,
    options?: FetchDetailOptions
  ) => Promise<GroupSessionItem | null>;
  upsertSession: (session: GroupSessionItem) => void;
  clear: () => void;
}

const mapSessionsById = (sessions: GroupSessionItem[]) => {
  return sessions.reduce<Record<string, GroupSessionItem>>((acc, session) => {
    acc[session.sessionId] = session;
    return acc;
  }, {});
};

export const useGroupSessionStore = create<GroupSessionState>()((set, get) => ({
  sessionsById: {},
  sessionIds: [],
  listFetchedAt: 0,
  detailFetchedAtById: {},
  isLoadingList: false,
  hasLoadedInitialData: false,
  isLoadingDetailById: {},

  fetchList: async (options) => {
    const { force = false, silent = false, includeDetails = true } = options ?? {};
    const ttlMs = options?.ttlMs ?? DEFAULT_LIST_TTL_MS;

    const { sessionIds, sessionsById, listFetchedAt } = get();
    const isCacheValid =
      sessionIds.length > 0 && listFetchedAt > 0 && Date.now() - listFetchedAt < ttlMs;

    if (!force && isCacheValid) {
      return sessionIds.map((sessionId) => sessionsById[sessionId]).filter(Boolean);
    }

    if (fetchListPromise) {
      return fetchListPromise;
    }

    if (!silent) {
      set({ isLoadingList: true });
    }

    fetchListPromise = (async () => {
      try {
        const sessionList = await groupSessionsService.getGroupSessions();

        if (!Array.isArray(sessionList) || sessionList.length === 0) {
          set({
            sessionsById: {},
            sessionIds: [],
            listFetchedAt: Date.now(),
            hasLoadedInitialData: true,
          });
          return [];
        }

        let nextSessions = sessionList;

        if (includeDetails) {
          const detailedSessions: GroupSessionItem[] = [];

          for (let index = 0; index < sessionList.length; index += DETAIL_BATCH_SIZE) {
            const batch = sessionList.slice(index, index + DETAIL_BATCH_SIZE);
            const batchResults = await Promise.all(
              batch.map(async (session) => {
                try {
                  return await groupSessionsService.getGroupSessionById(session.sessionId);
                } catch {
                  return session;
                }
              })
            );

            detailedSessions.push(...batchResults);
          }

          nextSessions = detailedSessions;
        }

        const now = Date.now();
        const nextById = {
          ...get().sessionsById,
          ...mapSessionsById(nextSessions),
        };

        const detailFetchedAtById = { ...get().detailFetchedAtById };
        nextSessions.forEach((session) => {
          detailFetchedAtById[session.sessionId] = now;
        });

        set({
          sessionsById: nextById,
          sessionIds: nextSessions.map((session) => session.sessionId),
          listFetchedAt: now,
          detailFetchedAtById,
          hasLoadedInitialData: true,
        });

        return nextSessions;
      } catch {
        set({ hasLoadedInitialData: true });
        return [];
      } finally {
        fetchListPromise = null;
        if (!silent) {
          set({ isLoadingList: false });
        }
      }
    })();

    return fetchListPromise;
  },

  fetchSessionById: async (sessionId, options) => {
    if (!sessionId) {
      return null;
    }

    const { force = false } = options ?? {};
    const ttlMs = options?.ttlMs ?? DEFAULT_DETAIL_TTL_MS;

    const { sessionsById, detailFetchedAtById } = get();
    const cachedSession = sessionsById[sessionId] ?? null;
    const cachedAt = detailFetchedAtById[sessionId] ?? 0;
    const isCacheValid = !!cachedSession && cachedAt > 0 && Date.now() - cachedAt < ttlMs;

    if (!force && isCacheValid) {
      return cachedSession;
    }

    const existingPromise = fetchDetailPromises.get(sessionId);
    if (existingPromise) {
      return existingPromise;
    }

    set((state) => ({
      isLoadingDetailById: {
        ...state.isLoadingDetailById,
        [sessionId]: true,
      },
    }));

    const fetchPromise = groupSessionsService
      .getGroupSessionById(sessionId)
      .then((session) => {
        const now = Date.now();

        set((state) => ({
          sessionsById: {
            ...state.sessionsById,
            [session.sessionId]: session,
          },
          detailFetchedAtById: {
            ...state.detailFetchedAtById,
            [session.sessionId]: now,
          },
        }));

        return session;
      })
      .catch(() => null)
      .finally(() => {
        fetchDetailPromises.delete(sessionId);
        set((state) => ({
          isLoadingDetailById: {
            ...state.isLoadingDetailById,
            [sessionId]: false,
          },
        }));
      });

    fetchDetailPromises.set(sessionId, fetchPromise);
    return fetchPromise;
  },

  upsertSession: (session) => {
    const now = Date.now();

    set((state) => {
      const hasInList = state.sessionIds.includes(session.sessionId);
      return {
        sessionsById: {
          ...state.sessionsById,
          [session.sessionId]: session,
        },
        sessionIds: hasInList ? state.sessionIds : [session.sessionId, ...state.sessionIds],
        detailFetchedAtById: {
          ...state.detailFetchedAtById,
          [session.sessionId]: now,
        },
      };
    });
  },

  clear: () => {
    set({
      sessionsById: {},
      sessionIds: [],
      listFetchedAt: 0,
      detailFetchedAtById: {},
      isLoadingList: false,
      hasLoadedInitialData: false,
      isLoadingDetailById: {},
    });
    fetchListPromise = null;
    fetchDetailPromises.clear();
  },
}));
