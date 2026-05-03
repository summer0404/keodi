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
    SEARCH: `${baseUrl}/places/search`,
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
  },
  CATEGORIES: {
    SEARCH: `${baseUrl}/categories/search`,
  },
});
