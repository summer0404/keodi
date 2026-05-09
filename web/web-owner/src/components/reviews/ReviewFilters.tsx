import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { type GetOwnerReviewsQuery } from "@keodi/shared"
import { RotateCcw } from "lucide-react"

interface ReviewFiltersProps {
    filters: GetOwnerReviewsQuery
    onChange: <K extends keyof GetOwnerReviewsQuery>(
        key: K,
        value: GetOwnerReviewsQuery[K]
    ) => void
    onReset: () => void
}

export function ReviewFilters({ filters, onChange, onReset }: ReviewFiltersProps) {
    return (
        <div className="flex flex-wrap gap-3 items-end">
            {/* Rating */}
            <div className="flex flex-col gap-1 min-w-27.5">
                <Label className="text-xs text-neutral-500">Rating</Label>
                <Select
                    value={filters.rating !== undefined ? String(filters.rating) : "any"}
                    onValueChange={(v) =>
                        onChange("rating", v === "any" ? undefined : (Number(v) as 1 | 2 | 3 | 4 | 5))
                    }
                >
                    <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="any">Any rating</SelectItem>
                        <SelectItem value="5">★★★★★ 5</SelectItem>
                        <SelectItem value="4">★★★★☆ 4</SelectItem>
                        <SelectItem value="3">★★★☆☆ 3</SelectItem>
                        <SelectItem value="2">★★☆☆☆ 2</SelectItem>
                        <SelectItem value="1">★☆☆☆☆ 1</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Responded */}
            <div className="flex flex-col gap-1 min-w-35">
                <Label className="text-xs text-neutral-500">Response status</Label>
                <Select
                    value={
                        filters.responded === undefined
                            ? "any"
                            : filters.responded
                                ? "yes"
                                : "no"
                    }
                    onValueChange={(v) =>
                        onChange(
                            "responded",
                            v === "any" ? undefined : v === "yes"
                        )
                    }
                >
                    <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="any">All reviews</SelectItem>
                        <SelectItem value="yes">Responded</SelectItem>
                        <SelectItem value="no">Not responded</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Date from */}
            <div className="flex flex-col gap-1 min-w-32.5">
                <Label className="text-xs text-neutral-500">From</Label>
                <Input
                    type="date"
                    className="h-8 text-xs"
                    value={filters.dateFrom ?? ""}
                    onChange={(e) => onChange("dateFrom", e.target.value || undefined)}
                    max={filters.dateTo}
                />
            </div>

            {/* Date to */}
            <div className="flex flex-col gap-1 min-w-32.5">
                <Label className="text-xs text-neutral-500">To</Label>
                <Input
                    type="date"
                    className="h-8 text-xs"
                    value={filters.dateTo ?? ""}
                    onChange={(e) => onChange("dateTo", e.target.value || undefined)}
                    min={filters.dateFrom}
                />
            </div>

            {/* Sort order */}
            <div className="flex flex-col gap-1 min-w-30">
                <Label className="text-xs text-neutral-500">Sort</Label>
                <Select
                    value={filters.sortOrder ?? "desc"}
                    onValueChange={(v) => onChange("sortOrder", v as "asc" | "desc")}
                >
                    <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="desc">Newest first</SelectItem>
                        <SelectItem value="asc">Oldest first</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Reset */}
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-8 gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 self-end"
            >
                <RotateCcw className="w-3 h-3" />
                Reset
            </Button>
        </div>
    )
}
