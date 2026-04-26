import * as z from "zod";

export const ownerLoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, { message: "Username or email is required" }),
  password: z.string().min(1, { message: "Password is required" }),
  rememberMe: z.boolean(),
});

export type OwnerLoginFormValues = z.infer<typeof ownerLoginSchema>;
