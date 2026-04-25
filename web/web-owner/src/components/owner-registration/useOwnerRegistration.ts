import { zodResolver } from "@hookform/resolvers/zod"
import { registerOwner } from "@keodi/shared"
import * as React from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { registerOwnerSchema, type RegisterOwnerFormValues } from "./schema"

export function useOwnerRegistration() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = React.useState(1)
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  const form = useForm<RegisterOwnerFormValues>({
    resolver: zodResolver(registerOwnerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
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

  const passwordValue = form.watch("password")
  const proofDocs = form.watch("proofDocumentUrls") || [""]

  const passwordRequirements = React.useMemo(() => [
    { label: "Min. 8 characters", isMet: passwordValue.length >= 8 },
    { label: "One number", isMet: /.*\d.*/.test(passwordValue) },
    { label: "One uppercase", isMet: /.*[A-Z].*/.test(passwordValue) },
    { label: "Special char (!@$%^&*+)", isMet: /.*[@$!%*?&^+#].*/.test(passwordValue) },
  ], [passwordValue])

  const onSubmit = async (data: RegisterOwnerFormValues) => {
    try {
      const { confirmPassword, countryCode, ...rest } = data;
      const payload = {
        ...rest,
        businessPhone: `${countryCode}${rest.businessPhone}`,
      };
      console.log("Outgoing API payload:", payload);
      await registerOwner(payload)
      setCurrentStep(3)
    } catch (error: any) {
      console.error("Submission failed:", error)
      setSubmitError(error.message || "An unexpected error occurred during registration.")
      setTimeout(() => setSubmitError(null), 5000)
    }
  }

  const nextStep = async () => {
    const fieldsToValidate = ['username', 'email', 'password', 'confirmPassword']
    const isStepValid = await form.trigger(fieldsToValidate as any)
    if (isStepValid) {
      setCurrentStep(2)
    }
  }

  const prevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1)
    }
  }

  const { errors, isValid } = form.formState;
  const wUsername = form.watch("username");
  const wEmail = form.watch("email");
  const wPassword = form.watch("password");
  const wConfirm = form.watch("confirmPassword");

  const isStep1Complete = !!(
    wUsername &&
    wEmail &&
    wPassword &&
    wConfirm &&
    !errors.username &&
    !errors.email &&
    !errors.password &&
    !errors.confirmPassword
  );

  return {
    form,
    navigate,
    currentStep,
    setCurrentStep,
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
    isValid: isValid && !submitError
  }
}
