export const TOKEN_KEYS = {
  OWNER: "owner_access_token",
  ADMIN: "admin_access_token",
} as const;

export const API_ENDPOINTS = (baseUrl: string) => ({
  AUTH: {
    LOGIN: `${baseUrl}/auth/login`,
    REGISTER_OWNER: `${baseUrl}/auth/register-owner`,
    REFRESH: `${baseUrl}/auth/refresh`,
  },
  PLACES: {
    ROOT: `${baseUrl}/places`,
    SEARCH: "http://157.66.218.6/api/v1/places/search",
    ADMIN: `${baseUrl}/places/admin`,
    APPROVE: (id: string) => `${baseUrl}/places/${id}/approve`,
    REJECT: (id: string) => `${baseUrl}/places/${id}/reject`,
  },
  OWNERSHIP_CLAIMS: {
    ROOT: `${baseUrl}/ownership-claims`,
    APPROVE: (id: string) => `${baseUrl}/ownership-claims/${id}/approve`,
    REJECT: (id: string) => `${baseUrl}/ownership-claims/${id}/reject`,
  },
  OWNER_APPLICATIONS: {
    ROOT: `${baseUrl}/owner-applications`,
    APPROVE: (id: string) => `${baseUrl}/owner-applications/${id}/approve`,
    REJECT: (id: string) => `${baseUrl}/owner-applications/${id}/reject`,
    RESUBMIT: `${baseUrl}/owner-applications/resubmit`,
    ME: `${baseUrl}/owner-applications/me`,
  },
  CATEGORIES: {
    SEARCH: `${baseUrl}/categories/search`,
  },
  REVIEWS: {
    OWNER: `${baseUrl}/reviews/owner`,
    ADMIN: `${baseUrl}/reviews/admin`,
    RESPONSE: (id: string) => `${baseUrl}/reviews/${id}/response`,
    FLAG: (id: string) => `${baseUrl}/reviews/${id}/flag`,
    APPROVE_FLAG: (id: string) => `${baseUrl}/reviews/${id}/approve-flags`,
    REJECT_FLAG: (id: string) => `${baseUrl}/reviews/${id}/reject-flags`,
  },
});
