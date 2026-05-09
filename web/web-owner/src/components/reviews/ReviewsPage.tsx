import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, ChevronLeft, ChevronRight, Star } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { FlagModal } from "./FlagModal"
import { ResponseModal } from "./ResponseModal"
import { ReviewCard } from "./ReviewCard"
import { ReviewFilters } from "./ReviewFilters"
import { useOwnerReviews } from "./useOwnerReviews"

export default function ReviewsPage() {
    const navigate = useNavigate()
    const {
        reviews,
        pagination,
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
    } = useOwnerReviews()

    return (
        <div className="min-h-screen bg-white sm:bg-[#fafafa]">
            <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 space-y-6">
                {/* Page header */}
                <div className="flex items-start gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => navigate("/home")}
                        className="mt-0.5 text-neutral-400 hover:text-neutral-900 shrink-0"
                        aria-label="Back to home"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">
                            My Reviews
                        </h1>
                        {!isLoading && (
                            <p className="text-sm text-neutral-500 mt-0.5">
                                {pagination.total === 0
                                    ? "No reviews yet"
                                    : `${pagination.total} review${pagination.total === 1 ? "" : "s"} across your places`}
                            </p>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <Card className="p-4 gap-0 ring-1 ring-neutral-200/80 shadow-none rounded-xl">
                    <ReviewFilters
                        filters={filters}
                        onChange={setFilter}
                        onReset={resetFilters}
                    />
                </Card>

                {/* Content */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-neutral-400">
                        <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                        <p className="text-sm">Loading reviews…</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <p className="text-sm text-destructive font-medium">{error}</p>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={resetFilters}
                        >
                            Try again
                        </Button>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-neutral-400">
                        <Star className="w-10 h-10 text-neutral-200" />
                        <p className="text-sm font-medium text-neutral-500">No reviews found</p>
                        <p className="text-xs text-center max-w-xs">
                            {Object.values(filters).some(
                                (v, i) => i > 1 && v !== undefined
                            )
                                ? "Try adjusting your filters to see more results."
                                : "Reviews from customers will appear here once they start coming in."}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Review list */}
                        <div className="space-y-3">
                            {reviews.map((review) => (
                                <ReviewCard
                                    key={review.id}
                                    review={review}
                                    onRespond={setRespondingTo}
                                    onDeleteResponse={handleDeleteResponse}
                                    onFlag={setFlaggingId}
                                />
                            ))}
                        </div>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center justify-center gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon-sm"
                                    onClick={() => setPage(pagination.page - 1)}
                                    disabled={pagination.page <= 1}
                                    aria-label="Previous page"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-sm text-neutral-600 tabular-nums min-w-20 text-center">
                                    Page {pagination.page} of {pagination.totalPages}
                                </span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon-sm"
                                    onClick={() => setPage(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.totalPages}
                                    aria-label="Next page"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            <ResponseModal
                review={respondingTo}
                onClose={() => setRespondingTo(null)}
                onSubmit={handleRespond}
            />
            <FlagModal
                reviewId={flaggingId}
                onClose={() => setFlaggingId(null)}
                onSubmit={handleFlag}
            />
        </div>
    )
}
