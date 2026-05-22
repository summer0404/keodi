import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { type ReviewDto } from "@keodi/shared"
import { useEffect, useState } from "react"

interface ResponseModalProps {
    review: ReviewDto | null
    onClose: () => void
    onSubmit: (id: string, text: string) => Promise<void>
}

export function ResponseModal({ review, onClose, onSubmit }: ResponseModalProps) {
    const isEditing = Boolean(review?.ownerResponse)
    const [text, setText] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Pre-fill on open / when review changes
    useEffect(() => {
        setText(review?.ownerResponse ?? "")
        setError(null)
    }, [review])

    async function handleSubmit() {
        if (!review) return
        const trimmed = text.trim()
        if (!trimmed) {
            setError("Response cannot be empty")
            return
        }
        setIsSubmitting(true)
        setError(null)
        try {
            await onSubmit(review.id, trimmed)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog
            open={Boolean(review)}
            onClose={onClose}
            title={isEditing ? "Edit your response" : "Respond to review"}
        >
            {review && (
                <>
                    {/* Reviewer summary */}
                    <div className="flex gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200/80 -mt-1">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="text-xs font-semibold text-neutral-800 truncate">
                                    {review.reviewerName}
                                </p>
                                <span className="text-xs text-amber-500 shrink-0">
                                    {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                                </span>
                            </div>
                            {review.text && (
                                <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2 leading-relaxed">
                                    {review.text}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Response textarea */}
                    <div className="flex flex-col gap-1.5">
                        <Label className="text-xs text-neutral-600">
                            {isEditing ? "Update your response" : "Your response"}
                        </Label>
                        <Textarea
                            value={text}
                            onChange={(e) => {
                                setText(e.target.value)
                                if (error) setError(null)
                            }}
                            placeholder="Write a public response that other customers will see..."
                            className="min-h-30 text-sm"
                            disabled={isSubmitting}
                        />
                        {error && <p className="text-xs text-destructive">{error}</p>}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !text.trim()}
                        >
                            {isSubmitting
                                ? isEditing
                                    ? "Saving…"
                                    : "Submitting…"
                                : isEditing
                                    ? "Save changes"
                                    : "Submit response"}
                        </Button>
                    </div>
                </>
            )}
        </Dialog>
    )
}
