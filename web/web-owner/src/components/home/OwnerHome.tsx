import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Building, Star, Store } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function OwnerHome() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-white sm:bg-[#fafafa] flex items-center justify-center p-4 py-8">
            <Card className="w-full max-w-xl bg-white ring-0 sm:ring-1 shadow-none sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-none sm:border-solid sm:border-neutral-200/60 p-6 sm:p-10 rounded-none sm:rounded-2xl">
                <div className="text-center space-y-6">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900 mb-2">Welcome Back</h1>
                        <p className="text-sm text-neutral-600">What would you like to do today?</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <button
                            onClick={() => navigate("/claim-place")}
                            className="flex flex-col items-center justify-center p-6 border border-neutral-200 rounded-xl hover:bg-neutral-50 hover:border-neutral-300 transition-all text-neutral-800"
                        >
                            <Building className="w-8 h-8 mb-3 text-neutral-500" />
                            <span className="font-semibold text-sm">Claim a Place</span>
                            <span className="text-xs text-neutral-500 mt-1 text-center">Take ownership of an existing business listing</span>
                        </button>

                        <button
                            onClick={() => navigate("/add-place")}
                            className="flex flex-col items-center justify-center p-6 border border-neutral-200 rounded-xl hover:bg-neutral-50 hover:border-neutral-300 transition-all text-neutral-800"
                        >
                            <Store className="w-8 h-8 mb-3 text-neutral-500" />
                            <span className="font-semibold text-sm">Add New Place</span>
                            <span className="text-xs text-neutral-500 mt-1 text-center">Create a completely new business listing</span>
                        </button>

                        <button
                            onClick={() => navigate("/reviews")}
                            className="flex flex-col items-center justify-center p-6 border border-neutral-200 rounded-xl hover:bg-neutral-50 hover:border-neutral-300 transition-all text-neutral-800 sm:col-span-2"
                        >
                            <Star className="w-8 h-8 mb-3 text-neutral-500" />
                            <span className="font-semibold text-sm">My Reviews</span>
                            <span className="text-xs text-neutral-500 mt-1 text-center">View and respond to customer reviews across your places</span>
                        </button>
                    </div>

                    <div className="pt-6 border-t border-neutral-100">
                        <Button
                            type="button"
                            onClick={() => {
                                localStorage.removeItem("owner_access_token")
                                sessionStorage.removeItem("owner_access_token")
                                navigate("/login")
                            }}
                            variant="ghost"
                            className="text-neutral-500 hover:text-neutral-900 h-10 rounded-lg text-xs font-semibold tracking-wider uppercase w-full"
                        >
                            Log Out
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    )
}
