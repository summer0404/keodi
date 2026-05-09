import { cn } from "@/lib/utils"
import * as React from "react"

interface DialogProps {
    open: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    className?: string
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
    // Close on Escape key
    React.useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [open, onClose])

    // Prevent body scroll when open
    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = ""
        }
        return () => { document.body.style.overflow = "" }
    }, [open])

    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            aria-modal="true"
            role="dialog"
            aria-labelledby="dialog-title"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Panel */}
            <div
                className={cn(
                    "relative z-10 w-full max-w-md bg-white rounded-2xl shadow-[0_20px_60px_rgb(0,0,0,0.12)] p-6 flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-200",
                    className
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4">
                    <h2
                        id="dialog-title"
                        className="text-base font-semibold text-neutral-900 leading-snug"
                    >
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 text-neutral-400 hover:text-neutral-700 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Close dialog"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {children}
            </div>
        </div>
    )
}
