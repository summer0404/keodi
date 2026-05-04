import { zodResolver } from "@hookform/resolvers/zod"
import keodiIcon from "@keodi/shared/assets/icon.png"
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ExternalLink,
  FileText,
  Globe,
  Info,
  MapPin,
  Plus,
  RefreshCw,
  Trash,
  X
} from "lucide-react"
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { resubmitOwnerApplication, getMyOwnerApplication } from "@keodi/shared"

// ─── Schema ───────────────────────────────────────────────────────────────────

const resubmitSchema = z.object({
  businessName: z.string().trim().min(2, "Business name must be at least 2 characters"),
  countryCode: z.string().min(2, "Required"),
  businessPhone: z.string().trim().min(7, "Please enter a valid phone number"),
  businessAddress: z.string().trim().min(5, "Please enter a valid business address"),
  taxId: z.string().trim().min(3, "Please enter a valid tax ID"),
  businessWebsite: z.string().trim().url("Please enter a valid URL").optional().or(z.literal("")),
  proofDocumentUrls: z
    .array(z.string().trim().url("Each document must be a valid URL"))
    .min(1, "At least one proof document is required"),
})

type ResubmitFormValues = z.infer<typeof resubmitSchema>

// ─── Component ────────────────────────────────────────────────────────────────

export default function ResubmitApplicationForm() {
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [rejectionReason, setRejectionReason] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(true)

  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || ""

  const form = useForm<ResubmitFormValues>({
    resolver: zodResolver(resubmitSchema),
    defaultValues: {
      businessName: "",
      countryCode: "+84",
      businessPhone: "",
      businessAddress: "",
      taxId: "",
      businessWebsite: "",
      proofDocumentUrls: [""],
    },
    mode: "onChange",
  })

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        if (!baseUrl) return
        const application = await getMyOwnerApplication(baseUrl)
        if (application) {
          setRejectionReason(application.rejectionReason)
          
          // Split phone number into country code and business phone
          let countryCode = "+84"
          let businessPhone = application.businessPhone
          if (application.businessPhone?.startsWith("+")) {
            // Very simple split for now, assuming +XX format
            countryCode = application.businessPhone.substring(0, 3)
            businessPhone = application.businessPhone.substring(3)
          }

          form.reset({
            businessName: application.businessName || "",
            countryCode: countryCode,
            businessPhone: businessPhone || "",
            businessAddress: application.businessAddress || "",
            taxId: application.taxId || "",
            businessWebsite: application.businessWebsite || "",
            proofDocumentUrls: application.proofDocumentUrls?.length > 0 
              ? application.proofDocumentUrls 
              : [""],
          })
        }
      } catch (error) {
        console.error("Failed to fetch application:", error)
        setSubmitError("Failed to load your application data. Please make sure you are logged in.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchApplication()
  }, [baseUrl, form])

  const proofDocs = form.watch("proofDocumentUrls")
  const isValid = form.formState.isValid
  const isSubmitting = form.formState.isSubmitting

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white sm:bg-[#fafafa] flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin" />
      </div>
    )
  }

  const onSubmit = async (data: ResubmitFormValues) => {
    try {
      setSubmitError(null)
      if (!baseUrl) throw new Error("Missing VITE_API_BASE_URL configuration")

      await resubmitOwnerApplication(
        {
          businessName: data.businessName,
          businessPhone: `${data.countryCode}${data.businessPhone}`,
          businessAddress: data.businessAddress,
          taxId: data.taxId,
          businessWebsite: data.businessWebsite || undefined,
          proofDocumentUrls: data.proofDocumentUrls.filter(Boolean),
        },
        baseUrl,
      )

      setSubmitted(true)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Something went wrong. Please try again.")
    }
  }

  // ─── Success State ────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen bg-white sm:bg-[#fafafa] flex flex-col items-center justify-center p-4 py-8">
        <Card className="w-full max-w-xl bg-white ring-0 sm:ring-1 shadow-none sm:shadow-sm border-none sm:border-solid sm:border-neutral-200/60 p-2 sm:p-10 rounded-none sm:rounded-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-neutral-100 rounded-2xl flex items-center justify-center mb-6">
              <RefreshCw className="w-10 h-10 text-neutral-900" strokeWidth={1.5} />
            </div>

            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900 mb-3">
              Application Resubmitted
            </h1>

            <p className="text-[15px] text-neutral-600 leading-relaxed mb-10 max-w-md">
              Your updated owner application is now under review. Our team will evaluate your business
              details and contact you by email within a few business days.
            </p>

            <Button
              onClick={() => navigate("/login")}
              className="w-full bg-black hover:bg-neutral-800 text-white h-12 rounded-xl text-sm font-semibold tracking-wide uppercase mb-3"
            >
              Return to Login
            </Button>
          </div>
        </Card>

        <div className="w-full max-w-xl mt-6">
          <div className="bg-neutral-100/80 rounded-xl p-5 flex items-start">
            <Info className="w-5 h-5 text-neutral-500 mt-0.5 mr-3 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-widest mb-1">What's next?</h4>
              <p className="text-sm text-neutral-600">
                You'll receive an email notification once your application is approved. Until then, your
                account access remains limited.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Form ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white sm:bg-[#fafafa] flex flex-col items-center justify-center p-4 py-8">
      <Card className="w-full max-w-xl bg-white ring-0 sm:ring-1 shadow-none sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-none sm:border-solid sm:border-neutral-200/60 p-2 sm:p-10 rounded-none sm:rounded-2xl">

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <img src={keodiIcon} alt="Keodi" className="w-28 h-28 drop-shadow-sm object-contain" />
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900 mb-1.5 -mt-8 relative z-10">
            Resubmit Application
          </h1>
          <p className="text-sm text-neutral-500">Update your business information and reapply.</p>
        </div>

        {/* Rejection Reason Banner */}
        {rejectionReason && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-red-700 uppercase tracking-widest mb-1">
                Previous Rejection Reason
              </p>
              <p className="text-sm text-red-700/90">{rejectionReason}</p>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            Please review and update your business details to address the rejection reason before resubmitting.
          </p>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* Business Name */}
            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    Business Name
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="Acme Corp"
                        className="pl-10 h-10 bg-transparent text-sm border-neutral-200 focus-visible:ring-neutral-900 focus-visible:ring-offset-0 rounded-lg"
                        {...field}
                      />
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Tax ID */}
            <FormField
              control={form.control}
              name="taxId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    Tax ID
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="XX-XXXXXXX"
                        className="pl-10 h-10 bg-transparent text-sm border-neutral-200 focus-visible:ring-neutral-900 focus-visible:ring-offset-0 rounded-lg"
                        {...field}
                      />
                      <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Business Address */}
            <FormField
              control={form.control}
              name="businessAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    Business Address
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="123 Main St, City"
                        className="pl-10 h-10 bg-transparent text-sm border-neutral-200 focus-visible:ring-neutral-900 focus-visible:ring-offset-0 rounded-lg"
                        {...field}
                      />
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Phone + Website */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Phone</label>
                <div className="flex items-start gap-4">
                  <FormField
                    control={form.control}
                    name="countryCode"
                    render={({ field }) => (
                      <FormItem className="w-16 m-0 space-y-0">
                        <FormControl>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-neutral-500 text-sm font-medium pointer-events-none">+</span>
                            <Input 
                              placeholder="84" 
                              className="h-10 text-sm border-neutral-200 focus-visible:ring-neutral-900 rounded-lg pl-6" 
                              {...field} 
                              value={field.value.replace('+', '')}
                              onChange={(e) => field.onChange(`+${e.target.value.replace(/\D/g, '')}`)}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="businessPhone"
                    render={({ field }) => (
                      <FormItem className="flex-1 m-0 space-y-0 text-left">
                        <FormControl>
                          <Input placeholder="234 567 8900" className="h-10 text-sm border-neutral-200 focus-visible:ring-neutral-900 rounded-lg" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs mt-1 absolute" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="businessWebsite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                      Website <span className="normal-case font-medium tracking-normal text-neutral-400 ml-1">(Optional)</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="https://example.com"
                          className="pl-10 h-10 bg-transparent text-sm border-neutral-200 focus-visible:ring-neutral-900 focus-visible:ring-offset-0 rounded-lg"
                          {...field}
                        />
                        <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Proof Documents */}
            <div className="pt-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                Proof Documents
              </label>
              <div className="mt-2 space-y-3">
                {proofDocs.map((_, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <FormField
                      control={form.control}
                      name={`proofDocumentUrls.${index}`}
                      render={({ field }) => (
                        <FormItem className="flex-1 m-0">
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="https://example.com/doc.pdf"
                                className="pl-10 h-10 text-sm border-neutral-200 focus-visible:ring-neutral-900 rounded-lg"
                                {...field}
                              />
                              <ExternalLink className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    {proofDocs.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          const updated = proofDocs.filter((_, i) => i !== index)
                          form.setValue("proofDocumentUrls", updated as any, { shouldValidate: true })
                        }}
                        className="h-10 px-3 text-neutral-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.setValue("proofDocumentUrls", [...proofDocs, ""] as any)
                  }}
                  className="w-full h-10 border-dashed border-neutral-200 text-neutral-500 hover:text-neutral-900"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Document
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 mt-6 border-t border-neutral-100">
              <Button
                type="button"
                variant="ghost"
                className="text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 px-5 font-medium rounded-lg h-10 text-sm"
                onClick={() => navigate("/login")}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={!isValid || isSubmitting}
                className="bg-neutral-900 hover:bg-neutral-800 text-white shadow-sm h-10 px-6 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Resubmit Application <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </Card>

      {/* Error Toast */}
      {submitError && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-8 fade-in duration-300">
          <div className="bg-red-50 text-red-900 border border-red-200 shadow-xl rounded-xl p-4 flex items-start max-w-sm md:max-w-md">
            <Info className="w-5 h-5 text-red-500 mt-0.5 mr-3 shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold mb-1">Submission Failed</h4>
              <p className="text-sm text-red-700/90">{submitError}</p>
            </div>
            <button
              onClick={() => setSubmitError(null)}
              className="ml-3 mt-0.5 text-red-400 hover:text-red-700 transition-colors"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
