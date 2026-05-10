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
  MapPin,
  ExternalLink,
  Building2,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { getAdminPlaces, approvePlace, rejectPlace } from "@keodi/shared"

type PlaceOwner = {
  id: string
  firstName?: string
  lastName?: string
  username: string
}

type PlaceCategory = {
  id: string
  name: string
  isMain: boolean
}

type AdminPlace = {
  id: string
  name: string
  description?: string
  status: string
  rating: number
  phoneNumber?: string
  website?: string
  featureImageUrl?: string
  fullAddress?: string
  street?: string
  ward?: string
  city?: string
  countryCode?: string
  ownerId?: string
  createdAt: string
  updatedAt: string
  owner?: PlaceOwner
  categories?: PlaceCategory[]
}

type PaginatedResponse = {
  data: AdminPlace[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const STATUS_OPTIONS = ["UNDER_REVIEW", "PUBLISHED", "SUSPENDED"] as const
type StatusFilter = typeof STATUS_OPTIONS[number] | "all"

export default function PlaceReview() {
  const [placesData, setPlacesData] = useState<PaginatedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [filter, setFilter] = useState<StatusFilter>("UNDER_REVIEW")
  const [page, setPage] = useState(1)

  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || ""

  const fetchPlaces = async () => {
    try {
      setLoading(true)
      setError(null)
      const statusParam = filter === "all" ? undefined : filter
      const data = await getAdminPlaces(baseUrl, statusParam, page, 10)
      setPlacesData(data)
    } catch (err: any) {
      setError(err.message || "Failed to fetch places")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlaces()
  }, [filter, page])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleApprove = async (placeId: string) => {
    try {
      setActionLoading(placeId)
      await approvePlace(placeId, baseUrl)
      setToast({ message: "Place approved and published successfully!", type: "success" })
      fetchPlaces()
    } catch (err: any) {
      setToast({ message: err.message || "Failed to approve", type: "error" })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (placeId: string) => {
    if (!rejectReason.trim()) return
    try {
      setActionLoading(placeId)
      await rejectPlace(placeId, rejectReason, baseUrl)
      setToast({ message: "Place rejected.", type: "success" })
      setRejectingId(null)
      setRejectReason("")
      fetchPlaces()
    } catch (err: any) {
      setToast({ message: err.message || "Failed to reject", type: "error" })
    } finally {
      setActionLoading(null)
    }
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      UNDER_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
      PUBLISHED: "bg-green-50 text-green-700 border-green-200",
      SUSPENDED: "bg-red-50 text-red-700 border-red-200",
    }
    const labels: Record<string, string> = {
      UNDER_REVIEW: "Under Review",
      PUBLISHED: "Published",
      SUSPENDED: "Suspended",
    }
    return (
      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${styles[status] || "bg-neutral-100 text-neutral-600 border-neutral-200"}`}>
        {labels[status] || status}
      </span>
    )
  }

  const totalPages = placesData?.totalPages ?? 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 mb-1">
          Place Reviews
        </h1>
        <p className="text-sm text-neutral-500">
          Review and manage submitted places.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(["UNDER_REVIEW", "PUBLISHED", "SUSPENDED", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              filter === f
                ? "bg-neutral-900 text-white"
                : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            {f === "all" ? "All" : f === "UNDER_REVIEW" ? "Under Review" : f}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          <span className="ml-3 text-sm text-neutral-500">Loading places...</span>
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

      {!loading && !error && (!placesData || placesData.data.length === 0) && (
        <div className="text-center py-20">
          <MapPin className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-sm text-neutral-500">No places found for this filter.</p>
        </div>
      )}

      {!loading && !error && placesData && placesData.data.length > 0 && (
        <div className="space-y-3">
          {placesData.data.map((place) => {
            const isExpanded = expandedId === place.id
            const isRejecting = rejectingId === place.id
            const ownerName = place.owner
              ? (place.owner.firstName && place.owner.lastName
                  ? `${place.owner.firstName} ${place.owner.lastName}`
                  : place.owner.username)
              : "No Owner"
            const mainCategory = place.categories?.find(c => c.isMain)

            return (
              <Card
                key={place.id}
                className="bg-white border border-neutral-200/60 shadow-[0_2px_8px_rgb(0,0,0,0.04)] rounded-xl overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-neutral-50/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : place.id)}
                >
                  <div className="flex items-center gap-4">
                    {place.featureImageUrl ? (
                      <img
                        src={place.featureImageUrl}
                        alt={place.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-neutral-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{place.name}</p>
                      <p className="text-xs text-neutral-500">
                        {mainCategory?.name || "Uncategorized"} · {ownerName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {statusBadge(place.status)}
                    <span className="text-xs text-neutral-400">
                      {new Date(place.createdAt).toLocaleDateString()}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-neutral-100 p-4 bg-neutral-50/50">
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Place Name</span>
                        <p className="text-neutral-800 mt-0.5">{place.name}</p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Owner</span>
                        <p className="text-neutral-800 mt-0.5">{ownerName}</p>
                      </div>
                      {place.description && (
                        <div className="col-span-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Description</span>
                          <p className="text-neutral-800 mt-0.5">{place.description}</p>
                        </div>
                      )}
                      <div className="col-span-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Address</span>
                        <p className="text-neutral-800 mt-0.5">
                          {place.fullAddress || [place.street, place.ward, place.city].filter(Boolean).join(", ") || "N/A"}
                        </p>
                      </div>
                      {place.phoneNumber && (
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Phone</span>
                          <p className="text-neutral-800 mt-0.5">{place.phoneNumber}</p>
                        </div>
                      )}
                      {place.website && (
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Website</span>
                          <a href={place.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-sm mt-0.5">
                            {place.website}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Submitted</span>
                        <p className="text-neutral-800 mt-0.5">{new Date(place.createdAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Rating</span>
                        <p className="text-neutral-800 mt-0.5">{place.rating.toFixed(1)}</p>
                      </div>
                    </div>

                    {/* Categories */}
                    {place.categories && place.categories.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-neutral-600 mb-1.5">Categories</p>
                        <div className="flex flex-wrap gap-2">
                          {place.categories.map((cat) => (
                            <span
                              key={cat.id}
                              className={`text-xs px-2.5 py-1 rounded-full border ${
                                cat.isMain
                                  ? "bg-black text-white border-black"
                                  : "bg-neutral-100 text-neutral-700 border-neutral-200"
                              }`}
                            >
                              {cat.name}{cat.isMain ? " (Main)" : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Feature Image */}
                    {place.featureImageUrl && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-neutral-600 mb-1.5">Feature Image</p>
                        <img
                          src={place.featureImageUrl}
                          alt={place.name}
                          className="w-full max-w-md h-48 object-cover rounded-lg border border-neutral-200"
                        />
                      </div>
                    )}

                    {place.status === "UNDER_REVIEW" && (
                      <div className="flex items-center gap-3 pt-3 border-t border-neutral-100">
                        {!isRejecting ? (
                          <>
                            <Button
                              onClick={() => handleApprove(place.id)}
                              disabled={actionLoading === place.id}
                              className="bg-green-600 hover:bg-green-700 text-white h-9 px-4 rounded-lg text-xs font-semibold tracking-wider uppercase"
                            >
                              {actionLoading === place.id ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <Check className="w-4 h-4 mr-2" />
                              )}
                              Approve
                            </Button>
                            <Button
                              onClick={() => setRejectingId(place.id)}
                              variant="outline"
                              className="h-9 px-4 rounded-lg text-xs font-semibold tracking-wider uppercase border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 w-full">
                            <Input
                              placeholder="Enter rejection reason..."
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              className="flex-1 h-9 text-sm"
                            />
                            <Button
                              onClick={() => handleReject(place.id)}
                              disabled={!rejectReason.trim() || actionLoading === place.id}
                              className="bg-red-600 hover:bg-red-700 text-white h-9 px-4 rounded-lg text-xs font-semibold"
                            >
                              {actionLoading === place.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                "Confirm"
                              )}
                            </Button>
                            <Button
                              onClick={() => { setRejectingId(null); setRejectReason(""); }}
                              variant="outline"
                              className="h-9 px-3 text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-neutral-500">
                Page {placesData.page} of {totalPages} · {placesData.total} total
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
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 shrink-0" />
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
