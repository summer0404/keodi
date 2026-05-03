import { API_ENDPOINTS, TOKEN_KEYS } from './constants';

// ─── Types ───────────────────────────────────────────────────────────────────

export type LoginPayload = {
  identifier: string;
  password: string;
  rememberMe: boolean;
};

export type CreateOwnershipClaimPayload = {
  placeId: string;
  relationship: string;
  proofDocumentUrls: string[];
  note?: string;
};

// ─── Utilities ──────────────────────────────────────────────────────────────

async function getErrorMessage(response: Response, fallbackMessage: string) {
  try {
    const errorData = await response.json();
    if (Array.isArray(errorData?.message)) {
      return errorData.message.join(', ');
    }
    return errorData?.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

// ─── Core Fetch Utility ──────────────────────────────────────────────────────

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  tokenKey: string = TOKEN_KEYS.OWNER
): Promise<Response> {
  let token = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey);
  }

  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const requestOptions: RequestInit = {
    ...options,
    headers,
    credentials: options.credentials || "include",
  };

  let response = await fetch(url, requestOptions);

  // If unauthorized, attempt to refresh the token
  if (response.status === 401 && typeof window !== 'undefined') {
    // Extract base URL for refresh endpoint
    const baseUrlMatch = url.match(/^(.*\/api\/v1)/);
    const refreshUrl = baseUrlMatch 
      ? `${baseUrlMatch[1]}/auth/refresh` 
      : url.split('/owner-applications')[0].split('/ownership-claims')[0].split('/places')[0].split('/categories')[0] + '/auth/refresh';

    try {
      const refreshResponse = await fetch(refreshUrl, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshResponse.ok) {
        const { accessToken } = await refreshResponse.json();

        // Update stored token
        if (localStorage.getItem(tokenKey) || !sessionStorage.getItem(tokenKey)) {
          localStorage.setItem(tokenKey, accessToken);
        } else {
          sessionStorage.setItem(tokenKey, accessToken);
        }

        // Retry original request
        headers.set("Authorization", `Bearer ${accessToken}`);
        requestOptions.headers = headers;
        response = await fetch(url, requestOptions);
      } else {
        throw new Error("Session expired");
      }
    } catch (error) {
      localStorage.removeItem(tokenKey);
      sessionStorage.removeItem(tokenKey);
      window.location.href = "/login";
    }
  }

  return response;
}

// ─── Public API Functions ────────────────────────────────────────────────────

export async function loginOwner(payload: LoginPayload, baseUrl: string) {
  const response = await fetch(API_ENDPOINTS(baseUrl).AUTH.LOGIN, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Login failed'));
  }

  return response.json();
}

export async function registerOwner(data: any, baseUrl: string) {
  const response = await fetch(API_ENDPOINTS(baseUrl).AUTH.REGISTER_OWNER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Registration failed'));
  }

  return response.json();
}

export async function searchPlaces(query: string, baseUrl: string, lat: number = 10.762622, lng: number = 106.660172) {
  const searchParams = new URLSearchParams({
    search: query,
    latitude: lat.toString(),
    longitude: lng.toString(),
  });
  
  const response = await fetchWithAuth(`${API_ENDPOINTS(baseUrl).PLACES.SEARCH}?${searchParams.toString()}`);
  
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to search places"));
  }
  
  return response.json();
}

export async function createPlace(data: FormData, baseUrl: string) {
  const response = await fetchWithAuth(API_ENDPOINTS(baseUrl).PLACES.ROOT, {
    method: "POST",
    body: data,
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to create place"));
  }

  return response.json();
}

export async function createOwnershipClaim(payload: CreateOwnershipClaimPayload, baseUrl: string) {
  const response = await fetchWithAuth(API_ENDPOINTS(baseUrl).OWNERSHIP_CLAIMS.ROOT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to create ownership claim"));
  }

  return response.json();
}

export async function searchCategories(query: string, baseUrl: string, limit: number = 10) {
  const searchParams = new URLSearchParams({ q: query, limit: limit.toString() });
  const response = await fetchWithAuth(`${API_ENDPOINTS(baseUrl).CATEGORIES.SEARCH}?${searchParams.toString()}`);
  
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to fetch categories"));
  }
  
  return response.json();
}

// ─── Admin API Functions ─────────────────────────────────────────────────────

export async function getOwnerApplications(baseUrl: string, status?: string, page: number = 1, limit: number = 10) {
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  if (status) params.set('status', status);

  const response = await fetchWithAuth(`${API_ENDPOINTS(baseUrl).OWNER_APPLICATIONS.ROOT}?${params.toString()}`, {}, TOKEN_KEYS.ADMIN);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to fetch owner applications'));
  }

  return response.json();
}

export async function getOwnershipClaims(baseUrl: string, status?: string, page: number = 1, limit: number = 10) {
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  if (status) params.set("status", status);

  const response = await fetchWithAuth(`${API_ENDPOINTS(baseUrl).OWNERSHIP_CLAIMS.ROOT}?${params.toString()}`, {}, TOKEN_KEYS.ADMIN);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to fetch ownership claims"));
  }

  return response.json();
}

export async function approveOwnerApplication(applicationId: string, baseUrl: string) {
  const response = await fetchWithAuth(API_ENDPOINTS(baseUrl).OWNER_APPLICATIONS.APPROVE(applicationId), {
    method: "POST",
  }, TOKEN_KEYS.ADMIN);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to approve owner application"));
  }

  return response.json();
}

export async function rejectOwnerApplication(applicationId: string, reason: string, baseUrl: string) {
  const response = await fetchWithAuth(API_ENDPOINTS(baseUrl).OWNER_APPLICATIONS.REJECT(applicationId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  }, TOKEN_KEYS.ADMIN);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to reject owner application"));
  }

  return response.json();
}

export async function approveOwnershipClaim(claimId: string, baseUrl: string) {
  const response = await fetchWithAuth(API_ENDPOINTS(baseUrl).OWNERSHIP_CLAIMS.APPROVE(claimId), {
    method: "POST",
  }, TOKEN_KEYS.ADMIN);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to approve ownership claim"));
  }

  return response.json();
}

export async function rejectOwnershipClaim(claimId: string, reason: string, baseUrl: string) {
  const response = await fetchWithAuth(API_ENDPOINTS(baseUrl).OWNERSHIP_CLAIMS.REJECT(claimId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  }, TOKEN_KEYS.ADMIN);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to reject ownership claim"));
  }

  return response.json();
}
