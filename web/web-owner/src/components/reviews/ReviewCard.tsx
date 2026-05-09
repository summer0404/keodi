import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { type ReviewDto } from "@keodi/shared"
import { Flag, MessageSquare, Pencil, Trash2 } from "lucide-react"

interface ReviewCardProps {
    review: ReviewDto
    onRespond: (review: ReviewDto) => void
    onDeleteResponse: (id: string) => void
    onFlag: (id: string) => void
}

function StarRating({ rating }: { rating: number }) {
    return (
        <span className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((star) => (
                <span
                    key={star}
                    className={star <= rating ? "text-amber-400" : "text-neutral-200"}
                    aria-hidden="true"
                >
                    ★
                </span>
            ))}
        </span>
    )
}

function Avatar({ name, picture }: { name: string; picture: string | null }) {
    if (picture) {
        return (
            <img
                src={picture}
                alt={name}
                className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-neutral-200"
            />
        )
    }
    const initials = name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("")
    return (
        <div className="w-9 h-9 rounded-full bg-neutral-100 ring-1 ring-neutral-200 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-neutral-500">{initials}</span>
        </div>
    )
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    })
}

export function ReviewCard({ review, onRespond, onDeleteResponse, onFlag }: ReviewCardProps) {
    const hasResponse = Boolean(review.ownerResponse)

    return (
        <Card className="p-0 gap-0 ring-1 ring-neutral-200/80 shadow-none rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-start gap-3 px-4 pt-4 pb-3">
                <Avatar name={review.reviewerName} picture={review.reviewerPicture} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-neutral-900 truncate">
                            {review.reviewerName}
                        </p>
                        <time className="text-xs text-neutral-400 shrink-0">
                            {formatDate(review.createdAt)}
                        </time>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <StarRating rating={review.rating} />
                        <span className="text-[11px] text-neutral-400 truncate" title={review.place?.name}>
                            {review.place?.name}
                        </span>
                    </div>
                </div>
            </div>

            {/* Review text */}
            <div className="px-4 pb-3">
                {review.text ? (
                    <p className="text-sm text-neutral-700 leading-relaxed">{review.text}</p>
                ) : (
                    <p className="text-sm text-neutral-400 italic">No written review</p>
                )}
            </div>

            {/* Images */}
            {review.images?.length > 0 && (
                <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
                    {review.images.map((src, i) => (
                        <img
                            key={i}
                            src={src}
                            alt={`Review image ${i + 1}`}
                            className="h-20 w-20 shrink-0 rounded-lg object-cover ring-1 ring-neutral-200"
                        />
                    ))}
                </div>
            )}

            {/* Owner response */}
            {hasResponse && (
                <div className="mx-4 mb-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200/80">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-xs font-semibold text-neutral-700">Your response</span>
                        {review.ownerResponseEditedAt && (
                            <span className="text-[10px] text-neutral-400 bg-neutral-200/60 px-1.5 py-0.5 rounded-full">
                                edited
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-neutral-600 leading-relaxed">{review.ownerResponse}</p>
                    {review.ownerRespondedAt && (
                        <p className="text-xs text-neutral-400 mt-1.5">{formatDate(review.ownerRespondedAt)}</p>
                    )}
                </div>
            )}

            {/* Action row */}
            <div className="flex items-center gap-1 px-3 pb-3 pt-1 flex-wrap border-t border-neutral-100">
                {!hasResponse ? (
                    <Button
                        size="xs"
                        variant="outline"
                        onClick={() => onRespond(review)}
                        className="gap-1.5 text-xs"
                    >
                        <MessageSquare className="w-3 h-3" />
                        Respond
                    </Button>
                ) : (
                    <>
                        <Button
                            size="xs"
                            variant="outline"
                            onClick={() => onRespond(review)}
                            className="gap-1.5 text-xs"
                        >
                            <Pencil className="w-3 h-3" />
                            Edit response
                        </Button>
                        <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => onDeleteResponse(review.id)}
                            className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                            <Trash2 className="w-3 h-3" />
                            Delete response
                        </Button>
                    </>
                )}
                <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => onFlag(review.id)}
                    className="gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 ml-auto"
                >
                    <Flag className="w-3 h-3" />
                    Flag
                </Button>
            </div>
        </Card>
    )
}
