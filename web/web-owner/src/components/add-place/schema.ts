import * as z from "zod";

export const addPlaceSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().optional(),
  street: z.string().min(5, "Street address is required"),
  ward: z.string().min(2, "Ward is required"),
  city: z.string().min(2, "City is required"),
  countryCode: z.string().min(2, "Country Code is required").default("VN"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  mainCategoryId: z.string().min(1, "Main Category is required"),
  phoneNumber: z.string().optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  googleMapLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  secondaryCategoryIds: z.array(z.string()).optional(),
  openingHours: z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),
    openTime: z.string(),
    closeTime: z.string(),
  })).optional(),
});

export type AddPlaceFormValues = z.infer<typeof addPlaceSchema>;
