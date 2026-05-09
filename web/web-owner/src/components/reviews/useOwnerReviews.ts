import {
  type GetOwnerReviewsQuery,
  type ReviewDto,
  type ReviewFlagReason,
  type ReviewResponseDto,
  deleteReviewResponse,
  flagReview,
  getOwnerReviews,
  respondToReview,
  updateReviewResponse,
} from "@keodi/shared";
import { useCallback, useEffect, useState } from "react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
const DEFAULT_LIMIT = 10;

export function useOwnerReviews() {
  const [data, setData] = useState<ReviewResponseDto>({
    reviews: [],
    total: 0,
    page: 1,
    limit: DEFAULT_LIMIT,
    totalPages: 0,
  });
  const [filters, setFiltersState] = useState<GetOwnerReviewsQuery>({
    page: 1,
    limit: DEFAULT_LIMIT,
    sortOrder: "desc",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [respondingTo, setRespondingTo] = useState<ReviewDto | null>(null);
  const [flaggingId, setFlaggingId] = useState<string | null>(null);

  const fetchReviews = useCallback(async (query: GetOwnerReviewsQuery) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getOwnerReviews(query, BASE_URL);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reviews");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews(filters);
  }, [filters, fetchReviews]);

  function setFilter<K extends keyof GetOwnerReviewsQuery>(
    key: K,
    value: GetOwnerReviewsQuery[K],
  ) {
    setFiltersState((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  function resetFilters() {
    setFiltersState({ page: 1, limit: DEFAULT_LIMIT, sortOrder: "desc" });
  }

  function setPage(page: number) {
    setFiltersState((prev) => ({ ...prev, page }));
  }

  async function handleRespond(id: string, text: string) {
    const review = data.reviews.find((r) => r.id === id);
    const hasResponse = Boolean(review?.ownerResponse);
    if (hasResponse) {
      await updateReviewResponse(id, text, BASE_URL);
    } else {
      await respondToReview(id, text, BASE_URL);
    }
    setRespondingTo(null);
    fetchReviews(filters);
  }

  async function handleDeleteResponse(id: string) {
    await deleteReviewResponse(id, BASE_URL);
    fetchReviews(filters);
  }

  async function handleFlag(id: string, reason: ReviewFlagReason) {
    await flagReview(id, reason, BASE_URL);
    setFlaggingId(null);
    fetchReviews(filters);
  }

  return {
    reviews: data.reviews,
    pagination: {
      page: data.page,
      totalPages: data.totalPages,
      total: data.total,
    },
    filters,
    isLoading,
    error,
    respondingTo,
    flaggingId,
    setFilter,
    resetFilters,
    setPage,
    setRespondingTo,
    setFlaggingId,
    handleRespond,
    handleDeleteResponse,
    handleFlag,
  };
}
