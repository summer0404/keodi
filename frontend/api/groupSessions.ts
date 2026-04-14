import { API_ENDPOINTS } from '@/constants/api';
import type {
  CreateGroupSessionResponse,
  FinalizeMemberVoteRequest,
  FinalizeMemberVoteResponse,
  FinalizeSessionVoteResponse,
  GroupSessionItem,
  InviteFriendResponse,
  JoinGroupSessionRequest,
  JoinGroupSessionResponse,
  VotePlaceSessionRequest,
  VotePlaceSessionResponse,
  GroupVoteItem,
} from '@/types/api';
import { apiClient } from './client';

export const groupSessionsService = {
  getGroupSessions: async (): Promise<GroupSessionItem[]> => {
    const response = await apiClient.get<GroupSessionItem[]>(API_ENDPOINTS.GROUP_SESSIONS);
    return response.data;
  },

  getGroupSessionById: async (sessionId: string): Promise<GroupSessionItem> => {
    const response = await apiClient.get<GroupSessionItem>(
      `${API_ENDPOINTS.GROUP_SESSIONS}/${sessionId}`
    );
    return response.data;
  },

  closeGroupSession: async (sessionId: string): Promise<GroupSessionItem> => {
    const response = await apiClient.post<GroupSessionItem>(
      `${API_ENDPOINTS.GROUP_SESSIONS}/${sessionId}/close`
    );
    return response.data;
  },

  createGroupSession: async (): Promise<CreateGroupSessionResponse> => {
    const response = await apiClient.post<CreateGroupSessionResponse>(API_ENDPOINTS.GROUP_SESSIONS);
    return response.data;
  },

  joinGroupSession: async (
    joinGroupSessionRequest: JoinGroupSessionRequest
  ): Promise<JoinGroupSessionResponse> => {
    const response = await apiClient.post<JoinGroupSessionResponse>(
      `${API_ENDPOINTS.GROUP_SESSIONS}/join`,
      joinGroupSessionRequest
    );
    return response.data;
  },

  inviteFriend: async (sessionId: string, friendId: string): Promise<InviteFriendResponse> => {
    const response = await apiClient.post<InviteFriendResponse>(
      `${API_ENDPOINTS.GROUP_SESSIONS}/${sessionId}/invite`,
      { friendId }
    );
    return response.data;
  },

  votePlace: async (
    sessionId: string,
    voteRequest: VotePlaceSessionRequest
  ): Promise<VotePlaceSessionResponse> => {
    const response = await apiClient.post<VotePlaceSessionResponse>(
      `${API_ENDPOINTS.GROUP_SESSIONS}/${sessionId}/vote`,
      voteRequest
    );
    return response.data;
  },

  finalizeMemberVote: async (
    sessionId: string,
    request: FinalizeMemberVoteRequest = {}
  ): Promise<FinalizeMemberVoteResponse> => {
    const response = await apiClient.post<FinalizeMemberVoteResponse>(
      `${API_ENDPOINTS.GROUP_SESSIONS}/${sessionId}/vote/finalize-member`,
      request
    );
    return response.data;
  },

  finalizeSessionVote: async (sessionId: string): Promise<FinalizeSessionVoteResponse> => {
    const response = await apiClient.post<FinalizeSessionVoteResponse>(
      `${API_ENDPOINTS.GROUP_SESSIONS}/${sessionId}/vote/finalize-session`
    );
    return response.data;
  },

  getVotes: async (sessionId: string) => {
    const response = await apiClient.get<GroupVoteItem>(
      `${API_ENDPOINTS.GROUP_SESSIONS}/${sessionId}/votes`
    );
    return response.data;
  },
};
