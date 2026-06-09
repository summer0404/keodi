import * as z from "zod"

export const registerOwnerSchema = z.object({
  username: z.string()
    .min(3, { message: "Username must be at least 3 characters" })
    .max(20, { message: "Username must not exceed 20 characters" })
    .regex(/^(?!\d+$)[A-Za-z0-9._]+$/, {
      message: "Letters, numbers, underscores, and dots only"
    }),
  email: z.string().email({ message: "Invalid email format" }),
  password: z.string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .regex(/.*[A-Z].*/, { message: "Must contain at least one uppercase letter" })
    .regex(/.*\d.*/, { message: "Must contain at least one number" })
    .regex(/.*[@$!%*?&^+#].*/, { message: "Must contain at least one special character" }),
  confirmPassword: z.string(),

  businessName: z.string().min(1, { message: "Business name is required" }),
  countryCode: z.string().min(1, { message: "Code required" }),
  businessPhone: z.string().min(1, { message: "Business phone is required" }),
  businessAddress: z.string().min(1, { message: "Business address is required" }),
  taxId: z.string().min(1, { message: "Tax ID is required" }),
  businessWebsite: z.string().url({ message: "Must be a valid URL address" }).optional().or(z.literal("")),
  proofDocumentUrls: z.array(z.string().url({ message: "Must be a valid document URL" }))
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export type RegisterOwnerFormValues = z.infer<typeof registerOwnerSchema>
