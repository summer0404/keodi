import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
    type AdminReviewDto,
    type AdminReviewsResponseDto,
    type ReviewFlagStatus,
    approveReviewFlag,
    getAdminReviews,
    rejectReviewFlag,
} from "@keodi/shared"
import defaultAvatar from "@keodi/shared/assets/default-avatar.webp"
import {
    AlertCircle,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Flag,
    Loader2,
    MessageSquare,
    RotateCcw,
    X,
} from "lucide-react"
import { useEffect, useState } from "react"

const FLAG_STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED", "all"] as const
type FilterValue = typeof FLAG_STATUS_OPTIONS[number]

const FLAG_REASON_LABELS: Record<string, string> = {
    SPAM: "Spam",
    FAKE: "Fake review",
    OFFENSIVE: "Offensive",
    IRRELEVANT: "Irrelevant",
    OTHER: "Other",
}

function StarRating({ rating }: { rating: number }) {
    return (
        <span className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={star <= rating ? "text-amber-400" : "text-neutral-200"}>
                    ★
                </span>
            ))}
        </span>
    )
}

function FlagStatusBadge({ status }: { status: ReviewFlagStatus | null }) {
    if (!status) return null
    const styles: Record<ReviewFlagStatus, string> = {
        PENDING: "bg-amber-50 text-amber-700 border-amber-200",
        APPROVED: "bg-green-50 text-green-700 border-green-200",
        REJECTED: "bg-red-50 text-red-700 border-red-200",
    }
    return (
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${styles[status]}`}>
            {status}
        </span>
    )
}

const RATING_OPTIONS = [
    { label: "Any rating", value: "" },
    { label: "★★★★★ (5)", value: "5" },
    { label: "★★★★ (4)", value: "4" },
    { label: "★★★ (3)", value: "3" },
    { label: "★★ (2)", value: "2" },
    { label: "★ (1)", value: "1" },
]

export default function ReviewModeration() {
    const [data, setData] = useState<AdminReviewsResponseDto | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [filter, setFilter] = useState<FilterValue>("PENDING")
    const [page, setPage] = useState(1)
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
    const [ratingFilter, setRatingFilter] = useState("")
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")
    const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc")

    const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || ""

    const hasAdvancedFilters = ratingFilter !== "" || dateFrom !== "" || dateTo !== ""

    const resetAdvancedFilters = () => {
        setRatingFilter("")
        setDateFrom("")
        setDateTo("")
        setSortOrder("desc")
        setPage(1)
    }

    const fetchReviews = async () => {
        try {
            setLoading(true)
            setError(null)
            const flagStatus = filter === "all" ? undefined : (filter as ReviewFlagStatus)
            const result = await getAdminReviews({
                flagStatus,
                page,
                limit: 10,
                sortOrder,
                rating: ratingFilter ? Number(ratingFilter) : undefined,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
            }, baseUrl)
            setData(result)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to fetch reviews")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchReviews()
    }, [filter, page, ratingFilter, dateFrom, dateTo, sortOrder])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const handleApprove = async (review: AdminReviewDto) => {
        try {
            setActionLoading(review.id)
            await approveReviewFlag(review.id, baseUrl)
            setToast({ message: "Flag approved — review is now hidden.", type: "success" })
            setExpandedId(null)
            fetchReviews()
        } catch (err: unknown) {
            setToast({ message: err instanceof Error ? err.message : "Failed to approve flag", type: "error" })
        } finally {
            setActionLoading(null)
        }
    }

    const handleReject = async (review: AdminReviewDto) => {
        try {
            setActionLoading(`reject-${review.id}`)
            await rejectReviewFlag(review.id, baseUrl)
            setToast({ message: "Flag rejected — review remains visible.", type: "success" })
            setExpandedId(null)
            fetchReviews()
        } catch (err: unknown) {
            setToast({ message: err instanceof Error ? err.message : "Failed to reject flag", type: "error" })
        } finally {
            setActionLoading(null)
        }
    }

    const totalPages = data?.totalPages ?? 0

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 mb-1">
                    Review Moderation
                </h1>
                <p className="text-sm text-neutral-500">
                    Review flagged content and approve or reject removal requests.
                </p>
            </div>

            {/* Flag status filter */}
            <div className="flex gap-2 mb-4 flex-wrap">
                {FLAG_STATUS_OPTIONS.map((f) => (
                    <button
                        key={f}
                        onClick={() => { setFilter(f); setPage(1) }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${filter === f
                            ? "bg-neutral-900 text-white"
                            : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
                            }`}
                    >
                        {f === "all" ? "All" : f}
                    </button>
                ))}
            </div>

            {/* Advanced filters */}
            <div className="bg-white border border-neutral-200/60 rounded-xl p-4 mb-6 shadow-[0_2px_8px_rgb(0,0,0,0.03)]">
                <div className="flex flex-wrap gap-3 items-end">
                    {/* Rating */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Rating</label>
                        <select
                            value={ratingFilter}
                            onChange={(e) => { setRatingFilter(e.target.value); setPage(1) }}
                            className="h-8 rounded-lg border border-neutral-200 bg-white px-2 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                        >
                            {RATING_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date from */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">From</label>
                        <input
                            type="date"
                            value={dateFrom}
                            max={dateTo || undefined}
                            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                            className="h-8 rounded-lg border border-neutral-200 bg-white px-2 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                        />
                    </div>

                    {/* Date to */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">To</label>
                        <input
                            type="date"
                            value={dateTo}
                            min={dateFrom || undefined}
                            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                            className="h-8 rounded-lg border border-neutral-200 bg-white px-2 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                        />
                    </div>

                    {/* Sort */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Sort</label>
                        <select
                            value={sortOrder}
                            onChange={(e) => { setSortOrder(e.target.value as "asc" | "desc"); setPage(1) }}
                            className="h-8 rounded-lg border border-neutral-200 bg-white px-2 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                        >
                            <option value="desc">Newest first</option>
                            <option value="asc">Oldest first</option>
                        </select>
                    </div>

                    {/* Reset */}
                    {hasAdvancedFilters && (
                        <button
                            onClick={resetAdvancedFilters}
                            className="h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold text-neutral-600 border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Reset filters
                        </button>
                    )}
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                    <span className="ml-3 text-sm text-neutral-500">Loading reviews...</span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-red-800">Error loading data</p>
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                </div>
            )}

            {/* Empty */}
            {!loading && !error && data?.reviews.length === 0 && (
                <div className="text-center py-20">
                    <Flag className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                    <p className="text-sm text-neutral-500">No flagged reviews for this filter.</p>
                </div>
            )}

            {/* Review list */}
            {!loading && !error && data && data.reviews.length > 0 && (
                <div className="space-y-3">
                    {data.reviews.map((review) => {
                        const isExpanded = expandedId === review.id
                        const isPending = review.flagStatus === "PENDING"

                        return (
                            <Card
                                key={review.id}
                                className="bg-white border border-neutral-200/60 shadow-[0_2px_8px_rgb(0,0,0,0.04)] rounded-xl overflow-hidden"
                            >
                                {/* Summary row */}
                                <div
                                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-neutral-50/50 transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : review.id)}
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <img
                                            src={review.reviewerPicture ?? defaultAvatar}
                                            alt={review.reviewerName}
                                            className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-neutral-200"
                                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = defaultAvatar }}
                                        />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-neutral-900 truncate">{review.reviewerName}</p>
                                            <p className="text-xs text-neutral-500 truncate">{review.place.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0 ml-4">
                                        {review.flagReason && (
                                            <span className="text-xs text-neutral-500 hidden sm:block">
                                                {FLAG_REASON_LABELS[review.flagReason] ?? review.flagReason}
                                            </span>
                                        )}
                                        <FlagStatusBadge status={review.flagStatus} />
                                        <StarRating rating={review.rating} />
                                        <span className="text-xs text-neutral-400">
                                            {new Date(review.createdAt).toLocaleDateString()}
                                        </span>
                                        {isExpanded ? (
                                            <ChevronUp className="w-4 h-4 text-neutral-400" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-neutral-400" />
                                        )}
                                    </div>
                                </div>

                                {/* Expanded detail */}
                                {isExpanded && (
                                    <div className="border-t border-neutral-100 p-4 bg-neutral-50/50 space-y-4">
                                        {/* Review content */}
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">Review</p>
                                            {review.text ? (
                                                <p className="text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap">{review.text}</p>
                                            ) : (
                                                <p className="text-sm text-neutral-400 italic">No written review</p>
                                            )}
                                        </div>

                                        {/* Metadata grid */}
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Place</span>
                                                <p className="text-neutral-800 mt-0.5">{review.place.name}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Reviewer</span>
                                                <p className="text-neutral-800 mt-0.5">{review.reviewerName}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Source</span>
                                                <p className="text-neutral-800 mt-0.5">{review.fromGoogle ? "Google" : "Keodi user"}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Submitted</span>
                                                <p className="text-neutral-800 mt-0.5">{new Date(review.createdAt).toLocaleString()}</p>
                                            </div>
                                            {review.flagReason && (
                                                <div className="col-span-2">
                                                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Flag reason</span>
                                                    <p className="text-neutral-800 mt-0.5">
                                                        {FLAG_REASON_LABELS[review.flagReason] ?? review.flagReason}
                                                    </p>
                                                </div>
                                            )}
                                            {review.hidden && (
                                                <div className="col-span-2">
                                                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                                                        This review is currently hidden
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Owner response if any */}
                                        {review.ownerResponse && (
                                            <div className="p-3 bg-white rounded-lg border border-neutral-200/80">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
                                                    <span className="text-xs font-semibold text-neutral-600">Owner response</span>
                                                </div>
                                                <p className="text-sm text-neutral-700 leading-relaxed">{review.ownerResponse}</p>
                                            </div>
                                        )}

                                        {/* Actions — only for PENDING */}
                                        {isPending && (
                                            <div className="flex items-center gap-3 pt-3 border-t border-neutral-100">
                                                <Button
                                                    onClick={() => handleApprove(review)}
                                                    disabled={!!actionLoading}
                                                    className="bg-green-600 hover:bg-green-700 text-white h-9 px-4 rounded-lg text-xs font-semibold tracking-wider uppercase"
                                                >
                                                    {actionLoading === review.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    ) : (
                                                        <Check className="w-4 h-4 mr-2" />
                                                    )}
                                                    Approve — Hide review
                                                </Button>
                                                <Button
                                                    onClick={() => handleReject(review)}
                                                    disabled={!!actionLoading}
                                                    variant="outline"
                                                    className="h-9 px-4 rounded-lg text-xs font-semibold tracking-wider uppercase border-red-200 text-red-600 hover:bg-red-50"
                                                >
                                                    {actionLoading === `reject-${review.id}` ? (
                                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    ) : (
                                                        <X className="w-4 h-4 mr-2" />
                                                    )}
                                                    Reject — Keep visible
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6">
                    <Button
                        variant="outline"
                        onClick={() => setPage((p) => p - 1)}
                        disabled={page <= 1}
                        className="h-8 w-8 p-0 rounded-lg"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-neutral-600 tabular-nums">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page >= totalPages}
                        className="h-8 w-8 p-0 rounded-lg"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div
                    className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${toast.type === "success"
                        ? "bg-green-600 text-white"
                        : "bg-red-600 text-white"
                        }`}
                >
                    {toast.message}
                </div>
            )}
        </div>
    )
}
