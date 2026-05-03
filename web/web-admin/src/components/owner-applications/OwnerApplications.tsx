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
  UserCheck,
  UserX,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { getOwnerApplications, approveOwnerApplication, rejectOwnerApplication } from "@keodi/shared"

type OwnerApplicationUser = {
  id: string
  firstName?: string
  lastName?: string
  username: string
  email: string
  role: string
}

type OwnerApplication = {
  id: string
  userId: string
  businessName: string
  businessPhone: string
  businessAddress: string
  taxId: string
  businessWebsite?: string
  proofDocumentUrls: string[]
  status: string
  rejectionReason?: string
  reviewedAt?: string
  createdAt: string
  updatedAt: string
  user?: OwnerApplicationUser
}

type PaginatedResponse = {
  data: OwnerApplication[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED"] as const
type StatusFilter = typeof STATUS_OPTIONS[number] | "all"

export default function OwnerApplications() {
  const [appsData, setAppsData] = useState<PaginatedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [filter, setFilter] = useState<StatusFilter>("PENDING")
  const [page, setPage] = useState(1)

  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || ""

  const fetchApplications = async () => {
    try {
      setLoading(true)
      setError(null)
      const statusParam = filter === "all" ? undefined : filter
      const data = await getOwnerApplications(baseUrl, statusParam, page, 10)
      setAppsData(data)
    } catch (err: any) {
      setError(err.message || "Failed to fetch owner applications")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [filter, page])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleApprove = async (applicationId: string) => {
    try {
      setActionLoading(applicationId)
      await approveOwnerApplication(applicationId, baseUrl)
      setToast({ message: "Owner application approved successfully!", type: "success" })
      fetchApplications()
    } catch (err: any) {
      setToast({ message: err.message || "Failed to approve", type: "error" })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (applicationId: string) => {
    if (!rejectReason.trim()) return
    try {
      setActionLoading(applicationId)
      await rejectOwnerApplication(applicationId, rejectReason, baseUrl)
      setToast({ message: "Owner application rejected.", type: "success" })
      setRejectingId(null)
      setRejectReason("")
      fetchApplications()
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
    }
    return (
      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${styles[status] || "bg-neutral-100 text-neutral-600 border-neutral-200"}`}>
        {status}
      </span>
    )
  }

  const totalPages = appsData?.totalPages ?? 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 mb-1">
          Owner Applications
        </h1>
        <p className="text-sm text-neutral-500">
          Review and manage owner registration applications.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(["PENDING", "APPROVED", "REJECTED", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              filter === f
                ? "bg-neutral-900 text-white"
                : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            {f === "all" ? "All" : f}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          <span className="ml-3 text-sm text-neutral-500">Loading applications...</span>
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

      {!loading && !error && (!appsData || appsData.data.length === 0) && (
        <div className="text-center py-20">
          <UserCheck className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-sm text-neutral-500">No applications found for this filter.</p>
        </div>
      )}

      {!loading && !error && appsData && appsData.data.length > 0 && (
        <div className="space-y-3">
          {appsData.data.map((app) => {
            const isExpanded = expandedId === app.id
            const isRejecting = rejectingId === app.id
            const displayName = app.user
              ? (app.user.firstName && app.user.lastName
                  ? `${app.user.firstName} ${app.user.lastName}`
                  : app.user.username)
              : app.userId

            return (
              <Card
                key={app.id}
                className="bg-white border border-neutral-200/60 shadow-[0_2px_8px_rgb(0,0,0,0.04)] rounded-xl overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-neutral-50/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : app.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-sm font-semibold text-neutral-700">
                      {(app.user?.firstName?.[0] || app.user?.username?.[0] || "?").toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{displayName}</p>
                      <p className="text-xs text-neutral-500">{app.businessName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {statusBadge(app.status)}
                    <span className="text-xs text-neutral-400">
                      {new Date(app.createdAt).toLocaleDateString()}
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
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Applicant</span>
                        <p className="text-neutral-800 mt-0.5">{displayName}</p>
                        {app.user?.email && <p className="text-xs text-neutral-500">{app.user.email}</p>}
                      </div>
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Business Name</span>
                        <p className="text-neutral-800 mt-0.5">{app.businessName}</p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Phone</span>
                        <p className="text-neutral-800 mt-0.5">{app.businessPhone}</p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Tax ID</span>
                        <p className="text-neutral-800 mt-0.5 font-mono text-xs">{app.taxId}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Business Address</span>
                        <p className="text-neutral-800 mt-0.5">{app.businessAddress}</p>
                      </div>
                      {app.businessWebsite && (
                        <div className="col-span-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Website</span>
                          <a href={app.businessWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-sm mt-0.5">
                            {app.businessWebsite}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Applied</span>
                        <p className="text-neutral-800 mt-0.5">{new Date(app.createdAt).toLocaleString()}</p>
                      </div>
                    </div>

                    {app.proofDocumentUrls.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-neutral-600 mb-1.5">Proof Documents</p>
                        <div className="flex flex-wrap gap-2">
                          {app.proofDocumentUrls.map((url, i) => (
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

                    {app.rejectionReason && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg">
                        <p className="text-xs font-semibold text-red-700 mb-1">Rejection Reason</p>
                        <p className="text-sm text-red-600">{app.rejectionReason}</p>
                      </div>
                    )}

                    {app.status === "PENDING" && (
                      <div className="flex items-center gap-3 pt-3 border-t border-neutral-100">
                        {!isRejecting ? (
                          <>
                            <Button
                              onClick={() => handleApprove(app.id)}
                              disabled={actionLoading === app.id}
                              className="bg-green-600 hover:bg-green-700 text-white h-9 px-4 rounded-lg text-xs font-semibold tracking-wider uppercase"
                            >
                              {actionLoading === app.id ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <Check className="w-4 h-4 mr-2" />
                              )}
                              Approve
                            </Button>
                            <Button
                              onClick={() => setRejectingId(app.id)}
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
                              onClick={() => handleReject(app.id)}
                              disabled={!rejectReason.trim() || actionLoading === app.id}
                              className="bg-red-600 hover:bg-red-700 text-white h-9 px-4 rounded-lg text-xs font-semibold"
                            >
                              {actionLoading === app.id ? (
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
                Page {appsData.page} of {totalPages} · {appsData.total} total
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
              <UserCheck className="w-5 h-5 text-green-500 mt-0.5 mr-3 shrink-0" />
            ) : (
              <UserX className="w-5 h-5 text-red-500 mt-0.5 mr-3 shrink-0" />
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
