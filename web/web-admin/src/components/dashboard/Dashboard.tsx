import { Routes, Route, NavLink, useNavigate, Navigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { ShieldCheck, Users, FileCheck, MapPin, LogOut } from "lucide-react"
import keodiIcon from "@keodi/shared/assets/icon.png"

import OwnerApplications from "../owner-applications/OwnerApplications"
import OwnershipClaims from "../ownership-claims/OwnershipClaims"
import PlaceReview from "../place-review/PlaceReview"

const ACCESS_TOKEN_KEY = "admin_access_token"

export default function Dashboard() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) {
      navigate("/login", { replace: true })
    } else {
      setIsAuthenticated(true)
    }
    setIsChecking(false)
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    sessionStorage.removeItem(ACCESS_TOKEN_KEY)
    navigate("/login", { replace: true })
  }

  if (isChecking || !isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col fixed h-screen">
        <div className="p-6 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <img src={keodiIcon} alt="Keodi" className="w-10 h-10 object-contain" />
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">Keodi Admin</h2>
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-neutral-500" />
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Control Panel</p>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavLink
            to="/dashboard/owner-applications"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              }`
            }
          >
            <Users className="w-4 h-4" />
            Owner Applications
          </NavLink>
          <NavLink
            to="/dashboard/ownership-claims"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              }`
            }
          >
            <FileCheck className="w-4 h-4" />
            Ownership Claims
          </NavLink>
          <NavLink
            to="/dashboard/place-reviews"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              }`
            }
          >
            <MapPin className="w-4 h-4" />
            Place Reviews
          </NavLink>
        </nav>

        <div className="p-4 border-t border-neutral-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <Routes>
          <Route path="/" element={<Navigate to="owner-applications" replace />} />
          <Route path="owner-applications" element={<OwnerApplications />} />
          <Route path="ownership-claims" element={<OwnershipClaims />} />
          <Route path="place-reviews" element={<PlaceReview />} />
        </Routes>
      </main>
    </div>
  )
}
