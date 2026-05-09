import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { type ReviewFlagReason } from "@keodi/shared"
import { useState } from "react"

const FLAG_REASONS: { value: ReviewFlagReason; label: string; description: string }[] = [
    { value: "SPAM", label: "Spam", description: "Irrelevant or repetitive content" },
    { value: "FAKE", label: "Fake review", description: "Reviewer never visited the place" },
    { value: "OFFENSIVE", label: "Offensive", description: "Contains hateful or harmful language" },
    { value: "IRRELEVANT", label: "Irrelevant", description: "Not about this place" },
    { value: "OTHER", label: "Other", description: "Another reason not listed above" },
]

interface FlagModalProps {
    reviewId: string | null
    onClose: () => void
    onSubmit: (id: string, reason: ReviewFlagReason) => Promise<void>
}

export function FlagModal({ reviewId, onClose, onSubmit }: FlagModalProps) {
    const [reason, setReason] = useState<ReviewFlagReason>("SPAM")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit() {
        if (!reviewId) return
        setIsSubmitting(true)
        setError(null)
        try {
            await onSubmit(reviewId, reason)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog
            open={Boolean(reviewId)}
            onClose={onClose}
            title="Flag review as inappropriate"
        >
            <p className="text-xs text-neutral-500 -mt-2">
                This will create a pending flag for admin review. The review will remain
                visible until an admin approves the flag.
            </p>

            <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-neutral-600">Reason</Label>
                <Select
                    value={reason}
                    onValueChange={(v) => setReason(v as ReviewFlagReason)}
                >
                    <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {FLAG_REASONS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                                <div className="flex flex-col">
                                    <span>{r.label}</span>
                                    <span className="text-xs text-neutral-400">{r.description}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

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
                    variant="destructive"
                    size="sm"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Flagging…" : "Submit flag"}
                </Button>
            </div>
        </Dialog>
    )
}
