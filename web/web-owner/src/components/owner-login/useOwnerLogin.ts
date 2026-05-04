import { zodResolver } from "@hookform/resolvers/zod";
import { loginOwner, getMyOwnerApplication } from "@keodi/shared";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { ownerLoginSchema, type OwnerLoginFormValues } from "./schema";

type LoginResponse = {
  accessToken?: string;
};

const ACCESS_TOKEN_KEY = "owner_access_token";

export function useOwnerLogin() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const form = useForm<OwnerLoginFormValues>({
    resolver: zodResolver(ownerLoginSchema),
    defaultValues: {
      identifier: "",
      password: "",
      rememberMe: false,
    },
    mode: "onChange",
  });

  const onSubmit = async (data: OwnerLoginFormValues) => {
    try {
      setSubmitError(null);

      const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
      if (!baseUrl) {
        throw new Error("Missing VITE_API_BASE_URL configuration");
      }

      const response = (await loginOwner(
        {
          identifier: data.identifier.trim(),
          password: data.password,
          rememberMe: data.rememberMe,
        },
        baseUrl,
      )) as LoginResponse;

      const activeStorage = data.rememberMe ? localStorage : sessionStorage;
      if (response.accessToken) {
        const inactiveStorage = data.rememberMe ? sessionStorage : localStorage;
        inactiveStorage.removeItem(ACCESS_TOKEN_KEY);
        activeStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
      } else {
        throw new Error("Login succeeded but no access token was returned");
      }

      // Check application status for redirection
      let targetPath = "/home";
      try {
        const application = await getMyOwnerApplication(baseUrl);
        if (application && application.status === "REJECTED") {
          targetPath = "/resubmit-application";
        }
      } catch (error) {
        // Fallback to home if check fails
        console.error("Failed to check application status:", error);
      }

      form.reset({
        identifier: data.identifier,
        password: "",
        rememberMe: data.rememberMe,
      });

      navigate(targetPath);
    } catch (error) {
      if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError("Login failed. Please try again.");
      }
    }
  };

  return {
    form,
    navigate,
    showPassword,
    setShowPassword,
    submitError,
    setSubmitError,
    onSubmit,
    isSubmitting: form.formState.isSubmitting,
  };
}
