import { ArrowRight, Check, Eye, EyeOff, Info, Lock, Mail, Plus, Trash, User, X } from "lucide-react"
import keodiIcon from "@keodi/shared/assets/icon.png"

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

import { steps } from "./constants"
import { useOwnerRegistration } from "./useOwnerRegistration"

export default function OwnerRegistrationForm() {
  const {
    form,
    navigate,
    currentStep,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    submitError,
    setSubmitError,
    passwordRequirements,
    proofDocs,
    onSubmit,
    nextStep,
    prevStep,
    isStep1Complete,
    isValid
  } = useOwnerRegistration()

  // --- SUCCESS SCREEN ---
  if (currentStep === 3) {
    return (
      <div className="min-h-screen bg-white sm:bg-[#fafafa] flex flex-col items-center justify-center p-4 py-8">
        <Card className="w-full max-w-xl bg-white ring-0 sm:ring-1 shadow-none sm:shadow-sm border-none sm:border-solid sm:border-neutral-200/60 p-2 sm:p-10 rounded-none sm:rounded-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-neutral-100 rounded-2xl flex items-center justify-center mb-4">
              <Mail className="w-10 h-10 text-neutral-900" strokeWidth={1.5} />
            </div>

            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900 mb-0">
              Application Under Review
            </h1>

            <p className="text-[15px] text-neutral-600 leading-relaxed mb-10 max-w-md">
              Thank you for registering. Our team is currently reviewing your business details. Please check your email for a confirmation and further instructions.
            </p>

            <Button
              onClick={() => navigate('/login')}
              className="w-full bg-black hover:bg-neutral-800 text-white h-12 rounded-xl text-sm font-semibold tracking-wide uppercase mb-6 mt-4">
              Return to Login
            </Button>
          </div>
        </Card>

        <div className="w-full max-w-xl mt-6">
          <div className="bg-neutral-100/80 rounded-xl p-5 flex items-start">
            <Info className="w-5 h-5 text-neutral-500 mt-0.5 mr-3 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-widest mb-1">Next Steps</h4>
              <p className="text-sm text-neutral-600">Please check your inbox for a verification link to activate your account and continue the process.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white sm:bg-[#fafafa] flex flex-col items-center justify-center p-4 py-8">
      <Card className="w-full max-w-xl bg-white ring-0 sm:ring-1 shadow-none sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-none sm:border-solid sm:border-neutral-200/60 p-2 sm:p-10 rounded-none sm:rounded-2xl">

        <div className="flex flex-col items-center text-center mb-8">
          <img src={keodiIcon} alt="Keodi" className="w-28 h-28 drop-shadow-sm object-contain" />
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900 mb-1.5 -mt-8 relative z-10">Register as Owner</h1>
          <p className="text-sm text-neutral-500">Complete your profile to manage operations.</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-8 right-8 top-[14px] -translate-y-[50%] h-[2px] bg-neutral-200 z-0" />
            {steps.map((step) => {
              const isActive = step.id === currentStep
              const isPast = step.id < currentStep
              return (
                <div key={step.id} className="flex flex-col items-center bg-white px-4 relative z-10">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300
                      ${isActive
                        ? 'bg-neutral-900 text-white ring-4 ring-neutral-900/10'
                        : isPast
                          ? 'bg-neutral-900 text-white'
                          : 'bg-white text-neutral-400 ring-1 ring-neutral-200'
                      }`}
                  >
                    {isPast ? <Check className="w-3.5 h-3.5" /> : step.id}
                  </div>
                  <span
                    className={`mt-2 text-[10px] font-semibold uppercase tracking-wider
                      ${isActive || isPast ? 'text-neutral-900' : 'text-neutral-400'}`}
                  >
                    {step.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className={`space-y-5 transition-all duration-300 ${currentStep === 1 ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}`}>
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Username</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="janesmith"
                          {...field}
                          className="pl-10 h-10 bg-transparent text-sm border-neutral-200 focus-visible:ring-neutral-900 focus-visible:ring-offset-0 rounded-lg"
                        />
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Email Address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="email"
                          placeholder="jane.doe@company.com"
                          {...field}
                          className="pl-10 h-10 bg-transparent text-sm border-neutral-200 focus-visible:ring-neutral-900 focus-visible:ring-offset-0 rounded-lg"
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
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Create Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                          className="pl-10 pr-10 h-10 bg-transparent text-sm border-neutral-200 focus-visible:ring-neutral-900 focus-visible:ring-offset-0 rounded-lg"
                        />
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>

                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-3">
                      {passwordRequirements.map((req, i) => (
                        <div key={i} className="flex items-center space-x-2">
                          <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${req.isMet ? 'bg-neutral-900' : 'bg-neutral-200'}`}>
                            <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />
                          </div>
                          <span className={`text-[11px] font-medium transition-colors ${req.isMet ? 'text-neutral-900' : 'text-neutral-500'}`}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem className="pt-2">
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                          className="pl-10 pr-10 h-10 bg-transparent text-sm border-neutral-200 focus-visible:ring-neutral-900 focus-visible:ring-offset-0 rounded-lg"
                        />
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className={`space-y-5 transition-all duration-300 ${currentStep === 2 ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}`}>
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Business Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corp" className="h-10 text-sm border-neutral-200 focus-visible:ring-neutral-900 rounded-lg" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Tax ID</FormLabel>
                    <FormControl>
                      <Input placeholder="XX-XXXXXXX" className="h-10 text-sm border-neutral-200 focus-visible:ring-neutral-900 rounded-lg" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="businessAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Business Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St" className="h-10 text-sm border-neutral-200 focus-visible:ring-neutral-900 rounded-lg" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
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
                        <Input placeholder="https://example.com" className="h-10 text-sm border-neutral-200 focus-visible:ring-neutral-900 rounded-lg" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Proof Documents</label>
                <div className="mt-2 space-y-3">
                  {proofDocs.map((_, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <FormField
                        control={form.control}
                        name={`proofDocumentUrls.${index}`}
                        render={({ field }) => (
                          <FormItem className="flex-1 m-0">
                            <FormControl>
                              <Input
                                placeholder="https://example.com/doc.pdf"
                                className="h-10 text-sm border-neutral-200 focus-visible:ring-neutral-900 rounded-lg"
                                {...field}
                              />
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
                            const newDocs = proofDocs.filter((_, i) => i !== index);
                            form.setValue("proofDocumentUrls", newDocs as any, { shouldValidate: true })
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
            </div>

            <div className="flex items-center justify-between pt-4 mt-6 border-t border-neutral-100">
              <Button
                type="button"
                variant="ghost"
                className="text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 px-5 font-medium rounded-lg h-10 text-sm"
                onClick={currentStep === 2 ? prevStep : () => navigate('/login')}
              >
                {currentStep === 2 ? 'Back' : 'Cancel'}
              </Button>

              {currentStep === 1 && (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!isStep1Complete}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white shadow-sm h-10 px-6 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next Step <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              )}
              {currentStep === 2 && (
                <Button
                  type="submit"
                  disabled={!isValid}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white shadow-sm h-10 px-6 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Application <Check className="ml-2 w-4 h-4" />
                </Button>
              )}
            </div>
          </form>
        </Form>
      </Card>

      {submitError && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-8 fade-in duration-300">
          <div className="bg-red-50 text-red-900 border border-red-200 shadow-xl rounded-xl p-4 flex items-start max-w-sm md:max-w-md">
            <Info className="w-5 h-5 text-red-500 mt-0.5 mr-3 shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold mb-1">Registration Failed</h4>
              <p className="text-sm text-red-700/90">{submitError}</p>
            </div>
            <button 
              onClick={() => setSubmitError(null)} 
              className="ml-3 mt-0.5 text-red-400 hover:text-red-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
