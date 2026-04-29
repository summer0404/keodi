import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useNavigate } from "react-router-dom"

export default function OwnerHome() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-white sm:bg-[#fafafa] flex items-center justify-center p-4 py-8">
            <Card className="w-full max-w-xl bg-white ring-0 sm:ring-1 shadow-none sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-none sm:border-solid sm:border-neutral-200/60 p-6 sm:p-10 rounded-none sm:rounded-2xl">
                <div className="text-center space-y-3">
                    <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">Home</h1>
                    <p className="text-sm text-neutral-600">You are logged in successfully.</p>
                    <div className="pt-4">
                        <Button
                            type="button"
                            onClick={() => navigate("/login")}
                            className="bg-black hover:bg-neutral-800 text-white h-10 rounded-lg text-xs font-semibold tracking-wider uppercase"
                        >
                            Back to Login
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    )
}
