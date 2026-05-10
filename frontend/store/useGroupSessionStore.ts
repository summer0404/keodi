import { create } from 'zustand';
import { groupSessionsService } from '@/api/groupSessions';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '@/constants/helper';
import type { GroupSessionItem } from '@/types/api';

const DEFAULT_LIST_TTL_MS = 15 * 1000;
const DEFAULT_DETAIL_TTL_MS = 15 * 1000;

const fetchListPromises = new Map<string, Promise<GroupSessionItem[]>>();
const fetchDetailPromises = new Map<string, Promise<GroupSessionItem | null>>();
let listLoadingCount = 0;
let listLoadingMoreCount = 0;

type FetchListOptions = {
  force?: boolean;
  silent?: boolean;
  ttlMs?: number;
  page?: number;
  limit?: number;
  append?: boolean;
  scopeKey?: string | null;
};

type FetchDetailOptions = {
  force?: boolean;
  ttlMs?: number;
};

interface GroupSessionState {
  sessionsById: Record<string, GroupSessionItem>;
  sessionIds: string[];
  currentPage: number;
  totalPages: number;
  totalSessions: number;
  limit: number;
  listScopeKey: string | null;
  listFetchedAt: number;
  detailFetchedAtById: Record<string, number>;
  isLoadingList: boolean;
  isLoadingMoreList: boolean;
  hasLoadedInitialData: boolean;
  hasMoreList: boolean;
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

const mergeSessions = (
  previousSessions: GroupSessionItem[],
  incomingSessions: GroupSessionItem[],
  append: boolean
) => {
  if (incomingSessions.length === 0) {
    return previousSessions;
  }

  if (append) {
    const existingIds = new Set(previousSessions.map((session) => session.sessionId));
    const filteredIncoming = incomingSessions.filter(
      (session) => !existingIds.has(session.sessionId)
    );

    if (filteredIncoming.length === 0) {
      return previousSessions;
    }

    return [...previousSessions, ...filteredIncoming];
  }

  if (previousSessions.length === 0) {
    return incomingSessions;
  }

  const incomingIds = new Set(incomingSessions.map((session) => session.sessionId));
  const remainingPrevious = previousSessions.filter(
    (session) => !incomingIds.has(session.sessionId)
  );

  return [...incomingSessions, ...remainingPrevious];
};

export const useGroupSessionStore = create<GroupSessionState>()((set, get) => ({
  sessionsById: {},
  sessionIds: [],
  currentPage: 0,
  totalPages: 0,
  totalSessions: 0,
  limit: DEFAULT_LIMIT,
  listScopeKey: null,
  listFetchedAt: 0,
  detailFetchedAtById: {},
  isLoadingList: false,
  isLoadingMoreList: false,
  hasLoadedInitialData: false,
  hasMoreList: false,
  isLoadingDetailById: {},

  fetchList: async (options) => {
    const { force = false, silent = false, append = false } = options ?? {};
    const ttlMs = options?.ttlMs ?? DEFAULT_LIST_TTL_MS;
    const page = options?.page ?? DEFAULT_PAGE;
    const limit = options?.limit ?? DEFAULT_LIMIT;
    const scopeKey = options?.scopeKey ?? null;
    const normalizedScopeKey = scopeKey ?? 'guest';
    const requestKey = `${normalizedScopeKey}:${page}:${limit}:${append ? 'append' : 'replace'}`;

    const { sessionIds, sessionsById, listFetchedAt, currentPage, listScopeKey } = get();
    const isScopeChanged = listScopeKey !== scopeKey;

    if (isScopeChanged) {
      set({
        sessionsById: {},
        sessionIds: [],
        currentPage: 0,
        totalPages: 0,
        totalSessions: 0,
        limit,
        listScopeKey: scopeKey,
        listFetchedAt: 0,
        hasLoadedInitialData: false,
        hasMoreList: false,
      });
    }

    const isCacheValid =
      !isScopeChanged &&
      page === DEFAULT_PAGE &&
      sessionIds.length > 0 &&
      listFetchedAt > 0 &&
      Date.now() - listFetchedAt < ttlMs;

    if (!force && isCacheValid) {
      return sessionIds.map((sessionId) => sessionsById[sessionId]).filter(Boolean);
    }

    const existingListPromise = fetchListPromises.get(requestKey);
    if (existingListPromise) {
      return existingListPromise;
    }

    if (!silent) {
      if (append) {
        listLoadingMoreCount += 1;
      } else {
        listLoadingCount += 1;
      }

      set({
        isLoadingList: listLoadingCount > 0,
        isLoadingMoreList: listLoadingMoreCount > 0,
      });
    }

    const fetchListPromise = (async () => {
      try {
        const response = await groupSessionsService.getGroupSessions({ page, limit });
        const sessionList = response.sessions ?? [];
        const now = Date.now();

        if (sessionList.length === 0 && page === DEFAULT_PAGE) {
          set({
            sessionsById: {},
            sessionIds: [],
            currentPage: DEFAULT_PAGE,
            totalPages: response.totalPages ?? 0,
            totalSessions: response.total ?? 0,
            limit: response.limit ?? limit,
            listScopeKey: scopeKey,
            listFetchedAt: now,
            hasLoadedInitialData: true,
            hasMoreList: false,
          });
          return [];
        }

        const latestState = get();
        const isScopeChangedAtApply = latestState.listScopeKey !== scopeKey;
        const previousSessions = isScopeChangedAtApply
          ? []
          : latestState.sessionIds
              .map((sessionId) => latestState.sessionsById[sessionId])
              .filter(Boolean);
        const nextSessions = mergeSessions(
          previousSessions,
          sessionList,
          append || page > DEFAULT_PAGE
        );
        const nextById = {
          ...(isScopeChangedAtApply ? {} : latestState.sessionsById),
          ...mapSessionsById(sessionList),
        };
        const nextCurrentPage = page;
        const nextTotalPages = response.totalPages ?? 1;
        const nextLimit = response.limit ?? limit;
        const nextHasMore = page < nextTotalPages;

        set({
          sessionsById: nextById,
          sessionIds: nextSessions.map((session) => session.sessionId),
          currentPage: nextCurrentPage,
          totalPages: nextTotalPages,
          totalSessions: response.total ?? nextSessions.length,
          limit: nextLimit,
          listScopeKey: scopeKey,
          listFetchedAt: now,
          hasLoadedInitialData: true,
          hasMoreList: nextHasMore,
        });

        return nextSessions;
      } catch {
        set({ hasLoadedInitialData: true });
        return [];
      } finally {
        fetchListPromises.delete(requestKey);
        if (!silent) {
          if (append) {
            listLoadingMoreCount = Math.max(0, listLoadingMoreCount - 1);
          } else {
            listLoadingCount = Math.max(0, listLoadingCount - 1);
          }

          set({
            isLoadingList: listLoadingCount > 0,
            isLoadingMoreList: listLoadingMoreCount > 0,
          });
        }
      }
    })();

    fetchListPromises.set(requestKey, fetchListPromise);
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
      currentPage: 0,
      totalPages: 0,
      totalSessions: 0,
      limit: DEFAULT_LIMIT,
      listScopeKey: null,
      listFetchedAt: 0,
      detailFetchedAtById: {},
      isLoadingList: false,
      isLoadingMoreList: false,
      hasLoadedInitialData: false,
      hasMoreList: false,
      isLoadingDetailById: {},
    });
    fetchListPromises.clear();
    listLoadingCount = 0;
    listLoadingMoreCount = 0;
    fetchDetailPromises.clear();
  },
}));
