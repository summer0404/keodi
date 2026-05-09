import { API_ENDPOINTS, TOKEN_KEYS } from "./constants";

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

// ─── Review Types ─────────────────────────────────────────────────────────────

export type ReviewFlagReason =
  | "SPAM"
  | "FAKE"
  | "OFFENSIVE"
  | "IRRELEVANT"
  | "OTHER";

export type ReviewDto = {
  id: string;
  placeId: string;
  userId: string;
  fromGoogle: boolean;
  reviewerName: string;
  reviewerPicture: string | null;
  rating: number;
  text: string | null;
  originalLanguage: string | null;
  sentimentAnalyzed: boolean;
  ownerResponse: string | null;
  ownerRespondedAt: string | null;
  ownerResponseEditedAt: string | null;
  createdAt: string;
  updatedAt: string;
  images: string[];
  place: { id: string; name: string };
};

export type ReviewResponseDto = {
  reviews: ReviewDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type GetOwnerReviewsQuery = {
  page?: number;
  limit?: number;
  rating?: number;
  dateFrom?: string;
  dateTo?: string;
  responded?: boolean;
  sortOrder?: "asc" | "desc";
  placeId?: string;
};

// ─── Utilities ──────────────────────────────────────────────────────────────

async function getErrorMessage(response: Response, fallbackMessage: string) {
  try {
    const errorData = await response.json();
    if (Array.isArray(errorData?.message)) {
      return errorData.message.join(", ");
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
  tokenKey: string = TOKEN_KEYS.OWNER,
): Promise<Response> {
  let token = null;
  if (typeof window !== "undefined") {
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
  if (response.status === 401 && typeof window !== "undefined") {
    // Extract base URL for refresh endpoint
    const baseUrlMatch = url.match(/^(.*\/api\/v1)/);
    const refreshUrl = baseUrlMatch
      ? `${baseUrlMatch[1]}/auth/refresh`
      : url
          .split("/owner-applications")[0]
          .split("/ownership-claims")[0]
          .split("/places")[0]
          .split("/categories")[0] + "/auth/refresh";

    try {
      const refreshResponse = await fetch(refreshUrl, {
        method: "POST",
        credentials: "include",
      });

      if (refreshResponse.ok) {
        const { accessToken } = await refreshResponse.json();

        // Update stored token
        if (
          localStorage.getItem(tokenKey) ||
          !sessionStorage.getItem(tokenKey)
        ) {
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
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Login failed"));
  }

  return response.json();
}

export async function registerOwner(data: any, baseUrl: string) {
  const response = await fetch(API_ENDPOINTS(baseUrl).AUTH.REGISTER_OWNER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Registration failed"));
  }

  return response.json();
}

export async function searchPlaces(
  query: string,
  baseUrl: string,
  lat: number = 10.762622,
  lng: number = 106.660172,
) {
  const searchParams = new URLSearchParams({
    search: query,
    latitude: lat.toString(),
    longitude: lng.toString(),
  });

  const response = await fetchWithAuth(
    `${API_ENDPOINTS(baseUrl).PLACES.SEARCH}?${searchParams.toString()}`,
  );

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

export async function createOwnershipClaim(
  payload: CreateOwnershipClaimPayload,
  baseUrl: string,
) {
  const response = await fetchWithAuth(
    API_ENDPOINTS(baseUrl).OWNERSHIP_CLAIMS.ROOT,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to create ownership claim"),
    );
  }

  return response.json();
}

export async function searchCategories(
  query: string,
  baseUrl: string,
  limit: number = 10,
) {
  const searchParams = new URLSearchParams({
    q: query,
    limit: limit.toString(),
  });
  const response = await fetchWithAuth(
    `${API_ENDPOINTS(baseUrl).CATEGORIES.SEARCH}?${searchParams.toString()}`,
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to fetch categories"),
    );
  }

  return response.json();
}

export type ResubmitOwnerApplicationPayload = {
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  taxId: string;
  businessWebsite?: string;
  proofDocumentUrls: string[];
};

export async function resubmitOwnerApplication(
  payload: ResubmitOwnerApplicationPayload,
  baseUrl: string,
) {
  const response = await fetchWithAuth(
    API_ENDPOINTS(baseUrl).OWNER_APPLICATIONS.RESUBMIT,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to resubmit owner application"),
    );
  }

  return response.json();
}

export async function getMyOwnerApplication(baseUrl: string) {
  const response = await fetchWithAuth(
    API_ENDPOINTS(baseUrl).OWNER_APPLICATIONS.ME,
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to fetch your owner application"),
    );
  }

  return response.json();
}

// ─── Admin API Functions ─────────────────────────────────────────────────────

export async function getAdminPlaces(
  baseUrl: string,
  status?: string,
  page: number = 1,
  limit: number = 10,
) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (status) params.set("status", status);

  const response = await fetchWithAuth(
    `${API_ENDPOINTS(baseUrl).PLACES.ADMIN}?${params.toString()}`,
    {},
    TOKEN_KEYS.ADMIN,
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to fetch places"));
  }

  return response.json();
}

export async function approvePlace(placeId: string, baseUrl: string) {
  const response = await fetchWithAuth(
    API_ENDPOINTS(baseUrl).PLACES.APPROVE(placeId),
    {
      method: "POST",
    },
    TOKEN_KEYS.ADMIN,
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to approve place"));
  }

  return response.json();
}

export async function rejectPlace(
  placeId: string,
  reason: string,
  baseUrl: string,
) {
  const response = await fetchWithAuth(
    API_ENDPOINTS(baseUrl).PLACES.REJECT(placeId),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    },
    TOKEN_KEYS.ADMIN,
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to reject place"));
  }

  return response.json();
}

export async function getOwnerApplications(
  baseUrl: string,
  status?: string,
  page: number = 1,
  limit: number = 10,
) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (status) params.set("status", status);

  const response = await fetchWithAuth(
    `${API_ENDPOINTS(baseUrl).OWNER_APPLICATIONS.ROOT}?${params.toString()}`,
    {},
    TOKEN_KEYS.ADMIN,
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to fetch owner applications"),
    );
  }

  return response.json();
}

export async function getOwnershipClaims(
  baseUrl: string,
  status?: string,
  page: number = 1,
  limit: number = 10,
) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (status) params.set("status", status);

  const response = await fetchWithAuth(
    `${API_ENDPOINTS(baseUrl).OWNERSHIP_CLAIMS.ROOT}?${params.toString()}`,
    {},
    TOKEN_KEYS.ADMIN,
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to fetch ownership claims"),
    );
  }

  return response.json();
}

export async function approveOwnerApplication(
  applicationId: string,
  baseUrl: string,
) {
  const response = await fetchWithAuth(
    API_ENDPOINTS(baseUrl).OWNER_APPLICATIONS.APPROVE(applicationId),
    {
      method: "POST",
    },
    TOKEN_KEYS.ADMIN,
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to approve owner application"),
    );
  }

  return response.json();
}

export async function rejectOwnerApplication(
  applicationId: string,
  reason: string,
  baseUrl: string,
) {
  const response = await fetchWithAuth(
    API_ENDPOINTS(baseUrl).OWNER_APPLICATIONS.REJECT(applicationId),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    },
    TOKEN_KEYS.ADMIN,
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to reject owner application"),
    );
  }

  return response.json();
}

export async function approveOwnershipClaim(claimId: string, baseUrl: string) {
  const response = await fetchWithAuth(
    API_ENDPOINTS(baseUrl).OWNERSHIP_CLAIMS.APPROVE(claimId),
    {
      method: "POST",
    },
    TOKEN_KEYS.ADMIN,
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to approve ownership claim"),
    );
  }

  return response.json();
}

export async function rejectOwnershipClaim(
  claimId: string,
  reason: string,
  baseUrl: string,
) {
  const response = await fetchWithAuth(
    API_ENDPOINTS(baseUrl).OWNERSHIP_CLAIMS.REJECT(claimId),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    },
    TOKEN_KEYS.ADMIN,
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to reject ownership claim"),
    );
  }

  return response.json();
}

// ─── Review API Functions ─────────────────────────────────────────────────────

export async function getOwnerReviews(
  params: GetOwnerReviewsQuery = {},
  baseUrl: string,
): Promise<ReviewResponseDto> {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined)
    searchParams.set("page", params.page.toString());
  if (params.limit !== undefined)
    searchParams.set("limit", params.limit.toString());
  if (params.rating !== undefined)
    searchParams.set("rating", params.rating.toString());
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.responded !== undefined)
    searchParams.set("responded", params.responded.toString());
  if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);

  const query = searchParams.toString();
  const url = query
    ? `${API_ENDPOINTS(baseUrl).REVIEWS.OWNER}?${query}`
    : API_ENDPOINTS(baseUrl).REVIEWS.OWNER;

  const response = await fetchWithAuth(url);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to fetch reviews"));
  }

  return response.json();
}

export async function respondToReview(
  id: string,
  text: string,
  baseUrl: string,
) {
  const response = await fetchWithAuth(
    API_ENDPOINTS(baseUrl).REVIEWS.RESPONSE(id),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to respond to review"),
    );
  }

  return response.json();
}

export async function updateReviewResponse(
  id: string,
  text: string,
  baseUrl: string,
) {
  const response = await fetchWithAuth(
    API_ENDPOINTS(baseUrl).REVIEWS.RESPONSE(id),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to update review response"),
    );
  }

  return response.json();
}

export async function deleteReviewResponse(id: string, baseUrl: string) {
  const response = await fetchWithAuth(
    API_ENDPOINTS(baseUrl).REVIEWS.RESPONSE(id),
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to delete review response"),
    );
  }

  return response.json();
}

export async function flagReview(
  id: string,
  reason: ReviewFlagReason,
  baseUrl: string,
) {
  const response = await fetchWithAuth(
    API_ENDPOINTS(baseUrl).REVIEWS.FLAG(id),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    },
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to flag review"));
  }

  return response.json();
}
