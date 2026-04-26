import keodiIcon from "@keodi/shared/assets/icon.png"
import {
    ArrowRight,
    Eye,
    EyeOff,
    Info,
    Lock,
    Mail,
    X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { useOwnerLogin } from "./useOwnerLogin"

export default function OwnerLoginForm() {
    const {
        form,
        navigate,
        showPassword,
        setShowPassword,
        submitError,
        setSubmitError,
        onSubmit,
        isSubmitting,
    } = useOwnerLogin()

    return (
        <div className="min-h-screen bg-white sm:bg-[#fafafa] flex flex-col items-center justify-center p-4 py-8">
            <Card className="w-full max-w-md bg-white ring-0 sm:ring-1 shadow-none sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-none sm:border-solid sm:border-neutral-200/60 p-2 sm:p-8 rounded-none sm:rounded-2xl">
                <div className="flex flex-col items-center text-center mb-8">
                    <img
                        src={keodiIcon}
                        alt="Keodi"
                        className="w-24 h-24 drop-shadow-sm object-contain"
                    />
                    <div className="flex flex-col items-center text-center mt-6">
                    <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-neutral-900 mb-1 -mt-8 relative z-10">
                        Login
                    </h1>
                    <p className="text-sm text-neutral-500">Access your business dashboard</p>
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                        <FormField
                            control={form.control}
                            name="identifier"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                                        Username or Email
                                    </FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                placeholder="Enter your email or username"
                                                className="pl-10 h-10 bg-transparent text-sm border-neutral-200 focus-visible:ring-neutral-900 focus-visible:ring-offset-0 rounded-lg"
                                                {...field}
                                            />
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                                        Password
                                    </FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Enter your password"
                                                className="pl-10 pr-10 h-10 bg-transparent text-sm border-neutral-200 focus-visible:ring-neutral-900 focus-visible:ring-offset-0 rounded-lg"
                                                {...field}
                                            />
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="w-4 h-4" />
                                                ) : (
                                                    <Eye className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            )}
                        />

                        <div className="flex items-center justify-between gap-4">
                            <FormField
                                control={form.control}
                                name="rememberMe"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={(checked) => field.onChange(checked === true)}
                                                aria-label="Remember me"
                                            />
                                        </FormControl>
                                        <label className="text-sm text-neutral-500">Remember Me</label>
                                    </FormItem>
                                )}
                            />

                            <button
                                type="button"
                                className="text-sm text-neutral-700 hover:text-neutral-900 transition-colors"
                            >
                                Forgot Password?
                            </button>
                        </div>

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-black hover:bg-neutral-800 text-white h-10 rounded-lg text-xs font-semibold tracking-wider uppercase"
                        >
                            {isSubmitting ? "Logging in..." : "Login"}
                            <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>

                        <div className="pt-5 border-t border-neutral-200">
                            <p className="text-sm text-neutral-600 text-center">
                                Don&apos;t have an account?{" "}
                                <button
                                    type="button"
                                    onClick={() => navigate("/registration")}
                                    className="font-semibold tracking-wider text-neutral-900 uppercase hover:text-black"
                                >
                                    Register as Owner
                                </button>
                            </p>
                        </div>
                    </form>
                </Form>
            </Card>

            {submitError && (
                <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-8 fade-in duration-300">
                    <div className="bg-red-50 text-red-900 border border-red-200 shadow-xl rounded-xl p-4 flex items-start max-w-sm md:max-w-md">
                        <Info className="w-5 h-5 text-red-500 mt-0.5 mr-3 shrink-0" />
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold mb-1">Login Failed</h4>
                            <p className="text-sm text-red-700/90">{submitError}</p>
                        </div>
                        <button
                            onClick={() => setSubmitError(null)}
                            className="ml-3 mt-0.5 text-red-400 hover:text-red-700 transition-colors"
                            aria-label="Close error"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
