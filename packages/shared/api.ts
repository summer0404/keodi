import { AUTH_API_URLS } from './constants';

export type LoginPayload = {
  identifier: string;
  password: string;
  rememberMe: boolean;
};

function getErrorMessage(response: Response, fallbackMessage: string) {
  return response
    .json()
    .then((errorData: any) => {
      if (Array.isArray(errorData?.message)) {
        return errorData.message.join(', ');
      }

      return errorData?.message || fallbackMessage;
    })
    .catch(() => fallbackMessage);
}

export async function loginOwner(
  payload: LoginPayload,
  baseUrl: string,
): Promise<any> {
  const response = await fetch(AUTH_API_URLS(baseUrl).LOGIN, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Login failed'));
  }

  return response.json();
}

export async function registerOwner(data: any, baseUrl: string): Promise<any> {
  const response = await fetch(AUTH_API_URLS(baseUrl).REGISTER_OWNER, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Registration failed'));
  }

  return response.json();
}

const ACCESS_TOKEN_KEY = "owner_access_token";

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let token = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
  }

  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Ensure cookies are sent if necessary
  const requestOptions: RequestInit = {
    ...options,
    headers,
    credentials: options.credentials || "include",
  };

  let response = await fetch(url, requestOptions);

  // If unauthorized, attempt to refresh the token using the httpOnly cookie
  if (response.status === 401 && typeof window !== 'undefined') {
    const baseUrlMatch = url.match(/^(.*\/api\/v1)/);
    const refreshUrl = baseUrlMatch ? `${baseUrlMatch[1]}/auth/refresh` : `/api/v1/auth/refresh`;

    try {
      const refreshResponse = await fetch(refreshUrl, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        const newAccessToken = refreshData.accessToken;

        // Update stored token (assuming localStorage since we don't know user preference here, but checking which one exists)
        if (localStorage.getItem(ACCESS_TOKEN_KEY)) {
          localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
        } else if (sessionStorage.getItem(ACCESS_TOKEN_KEY)) {
          sessionStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
        } else {
          // Default to localStorage if somehow missing
          localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
        }

        // Retry original request with new token
        headers.set("Authorization", `Bearer ${newAccessToken}`);
        requestOptions.headers = headers;
        response = await fetch(url, requestOptions);
      } else {
        throw new Error("Refresh token expired or invalid");
      }
    } catch (error) {
      // Refresh failed, clear tokens and redirect to login
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      window.location.href = "/login";
    }
  }

  return response;
}

export async function searchPlaces(query: string, baseUrl: string, lat?: number, lng?: number) {
  const searchParams = new URLSearchParams({
    search: query,
    latitude: lat ? lat.toString() : "10.762622",
    longitude: lng ? lng.toString() : "106.660172",
  });
  
  const response = await fetchWithAuth(`${baseUrl}/places/search?${searchParams.toString()}`);
  
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to search places"));
  }
  
  return response.json();
}

export async function createPlace(data: FormData, baseUrl: string) {
  const response = await fetchWithAuth(`${baseUrl}/places`, {
    method: "POST",
    body: data,
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to create place"));
  }

  return response.json();
}

export type CreateOwnershipClaimPayload = {
  placeId: string;
  relationship: string;
  proofDocumentUrls: string[];
  note?: string;
};

export async function createOwnershipClaim(payload: CreateOwnershipClaimPayload, baseUrl: string) {
  const response = await fetchWithAuth(`${baseUrl}/ownership-claims`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to create ownership claim"));
  }

  return response.json();
}

export async function searchCategories(query: string, baseUrl: string, limit: number = 10) {
  const searchParams = new URLSearchParams({
    q: query,
    limit: limit.toString(),
  });
  
  const response = await fetchWithAuth(`${baseUrl}/categories/search?${searchParams.toString()}`);
  
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to fetch categories"));
  }
  
  return response.json();
}
