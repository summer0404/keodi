import { useEffect, useState } from "react"
import {
  Check,
  X,
  Info,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  FileX,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { getOwnershipClaims, approveOwnershipClaim, rejectOwnershipClaim } from "@keodi/shared"

type OwnershipClaim = {
  id: string
  userId: string
  placeId: string
  relationship: string
  proofDocumentUrls: string[]
  note?: string
  status: string
  rejectionReason?: string
  reviewedAt?: string
  createdAt: string
  updatedAt: string
  user?: {
    id: string
    firstName: string
    lastName: string
    username: string
  }
  place?: {
    id: string
    name: string
  }
}

type PlaceWithClaims = {
  id: string
  name: string
  ownerId?: string
  owner?: {
    id: string
    firstName?: string
    lastName?: string
    username: string
  }
  ownershipClaims: OwnershipClaim[]
}

type PaginatedResponse = {
  data: PlaceWithClaims[]
  total: number
  page: number
  limit: number
}

export default function OwnershipClaims() {
  const [claimsData, setClaimsData] = useState<PaginatedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expandedPlaceId, setExpandedPlaceId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [filter, setFilter] = useState<string | undefined>("PENDING")
  const [page, setPage] = useState(1)

  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || ""

  const fetchClaims = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getOwnershipClaims(baseUrl, filter, page, 10)
      setClaimsData(data)
    } catch (err: any) {
      setError(err.message || "Failed to fetch ownership claims")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClaims()
  }, [filter, page])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleApprove = async (claimId: string) => {
    try {
      setActionLoading(claimId)
      await approveOwnershipClaim(claimId, baseUrl)
      setToast({ message: "Ownership claim approved successfully!", type: "success" })
      fetchClaims()
    } catch (err: any) {
      setToast({ message: err.message || "Failed to approve", type: "error" })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (claimId: string) => {
    if (!rejectReason.trim()) return
    try {
      setActionLoading(claimId)
      await rejectOwnershipClaim(claimId, rejectReason, baseUrl)
      setToast({ message: "Ownership claim rejected.", type: "success" })
      setRejectingId(null)
      setRejectReason("")
      fetchClaims()
    } catch (err: any) {
      setToast({ message: err.message || "Failed to reject", type: "error" })
    } finally {
      setActionLoading(null)
    }
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: "bg-amber-50 text-amber-700 border-amber-200",
      APPROVED: "bg-green-50 text-green-700 border-green-200",
      REJECTED: "bg-red-50 text-red-700 border-red-200",
      DISPUTED: "bg-purple-50 text-purple-700 border-purple-200",
    }
    return (
      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${styles[status] || "bg-neutral-100 text-neutral-600 border-neutral-200"}`}>
        {status}
      </span>
    )
  }

  const totalPages = claimsData ? Math.ceil(claimsData.total / claimsData.limit) : 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 mb-1">
          Ownership Claims
        </h1>
        <p className="text-sm text-neutral-500">
          Review and manage place ownership claims grouped by place.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(["PENDING", "APPROVED", "REJECTED", "DISPUTED", undefined] as const).map((f) => (
          <button
            key={f ?? "all"}
            onClick={() => {
              setFilter(f)
              setPage(1)
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              filter === f
                ? "bg-neutral-900 text-white"
                : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            {f ?? "All"}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          <span className="ml-3 text-sm text-neutral-500">Loading claims...</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Error loading data</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && (!claimsData || claimsData.data.length === 0) && (
        <div className="text-center py-20">
          <FileCheck className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-sm text-neutral-500">No ownership claims found for this filter.</p>
        </div>
      )}

      {!loading && !error && claimsData && claimsData.data.length > 0 && (
        <div className="space-y-4">
          {claimsData.data.map((place) => {
            const isExpanded = expandedPlaceId === place.id

            return (
              <Card
                key={place.id}
                className="bg-white border border-neutral-200/60 shadow-[0_2px_8px_rgb(0,0,0,0.04)] rounded-xl overflow-hidden"
              >
                {/* Place Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-neutral-50/50 transition-colors"
                  onClick={() => setExpandedPlaceId(isExpanded ? null : place.id)}
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{place.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-neutral-500 font-mono">{place.id.slice(0, 16)}...</p>
                      {place.owner && (
                        <span className="text-xs text-green-600">
                          Owner: {place.owner.firstName} {place.owner.lastName || place.owner.username}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                      {place.ownershipClaims.length} claim{place.ownershipClaims.length !== 1 ? "s" : ""}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Claims */}
                {isExpanded && (
                  <div className="border-t border-neutral-100">
                    {place.ownershipClaims.map((claim, idx) => {
                      const isRejecting = rejectingId === claim.id

                      return (
                        <div
                          key={claim.id}
                          className={`p-4 ${idx > 0 ? "border-t border-neutral-100" : ""} bg-neutral-50/30`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-semibold text-neutral-700">
                                {(claim.user?.firstName?.[0] || claim.user?.username?.[0] || "?").toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-neutral-800">
                                  {claim.user?.firstName && claim.user?.lastName
                                    ? `${claim.user.firstName} ${claim.user.lastName}`
                                    : claim.user?.username || "Unknown"}
                                </p>
                                <p className="text-xs text-neutral-500">
                                  Relationship: <strong>{claim.relationship}</strong>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {statusBadge(claim.status)}
                              <span className="text-xs text-neutral-400">
                                {new Date(claim.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {claim.note && (
                            <div className="mb-3 p-2.5 bg-neutral-100 rounded-lg">
                              <p className="text-xs font-semibold text-neutral-600 mb-1">Note</p>
                              <p className="text-sm text-neutral-700">{claim.note}</p>
                            </div>
                          )}

                          {claim.proofDocumentUrls.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-neutral-600 mb-1.5">Proof Documents</p>
                              <div className="flex flex-wrap gap-2">
                                {claim.proofDocumentUrls.map((url, i) => (
                                  <a
                                    key={i}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full hover:bg-blue-100 transition-colors border border-blue-200"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    Document {i + 1}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {claim.rejectionReason && (
                            <div className="mb-3 p-2.5 bg-red-50 border border-red-100 rounded-lg">
                              <p className="text-xs font-semibold text-red-700 mb-1">Rejection Reason</p>
                              <p className="text-sm text-red-600">{claim.rejectionReason}</p>
                            </div>
                          )}

                          {claim.status === "PENDING" && (
                            <div className="flex items-center gap-3 pt-3 border-t border-neutral-100">
                              {!isRejecting ? (
                                <>
                                  <Button
                                    onClick={() => handleApprove(claim.id)}
                                    disabled={actionLoading === claim.id}
                                    className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 rounded-lg text-xs font-semibold tracking-wider uppercase"
                                  >
                                    {actionLoading === claim.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5 mr-1.5" />
                                    )}
                                    Approve
                                  </Button>
                                  <Button
                                    onClick={() => setRejectingId(claim.id)}
                                    variant="outline"
                                    className="h-8 px-3 rounded-lg text-xs font-semibold tracking-wider uppercase border-red-200 text-red-600 hover:bg-red-50"
                                  >
                                    <X className="w-3.5 h-3.5 mr-1.5" />
                                    Reject
                                  </Button>
                                </>
                              ) : (
                                <div className="flex items-center gap-2 w-full">
                                  <Input
                                    placeholder="Enter rejection reason..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    className="flex-1 h-8 text-sm"
                                  />
                                  <Button
                                    onClick={() => handleReject(claim.id)}
                                    disabled={!rejectReason.trim() || actionLoading === claim.id}
                                    className="bg-red-600 hover:bg-red-700 text-white h-8 px-3 rounded-lg text-xs font-semibold"
                                  >
                                    {actionLoading === claim.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      "Confirm"
                                    )}
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setRejectingId(null)
                                      setRejectReason("")
                                    }}
                                    variant="outline"
                                    className="h-8 px-3 text-xs"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-neutral-500">
                Page {claimsData.page} of {totalPages} · {claimsData.total} total
              </p>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  variant="outline"
                  className="h-8 px-3 text-xs"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  variant="outline"
                  className="h-8 px-3 text-xs"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-8 fade-in duration-300">
          <div
            className={`border shadow-xl rounded-xl p-4 flex items-start max-w-sm ${
              toast.type === "success"
                ? "bg-green-50 text-green-900 border-green-200"
                : "bg-red-50 text-red-900 border-red-200"
            }`}
          >
            {toast.type === "success" ? (
              <FileCheck className="w-5 h-5 text-green-500 mt-0.5 mr-3 shrink-0" />
            ) : (
              <FileX className="w-5 h-5 text-red-500 mt-0.5 mr-3 shrink-0" />
            )}
            <p className="text-sm">{toast.message}</p>
            <button onClick={() => setToast(null)} className="ml-3 mt-0.5 opacity-50 hover:opacity-100">
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
