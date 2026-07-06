import { useCallback, useState } from "react";

export type FormErrors = Record<string, string | undefined>;

export type ApiFormError = {
  ok: false;
  message: string;
  fieldErrors?: Record<string, string>;
};

export function useFormErrors() {
  const [errors, setErrors] = useState<FormErrors>({});

  const fieldError = useCallback((key: string) => errors[key], [errors]);

  const setFieldError = useCallback((key: string, message: string) => {
    setErrors((prev) => ({ ...prev, [key]: message }));
  }, []);

  const setFieldErrorsFromApi = useCallback((fieldErrors: Record<string, string>) => {
    setErrors((prev) => ({ ...prev, ...fieldErrors }));
  }, []);

  const clearField = useCallback((key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setErrors({}), []);

  const applyApiError = useCallback((result: ApiFormError): string | null => {
    if (result.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
      setFieldErrorsFromApi(result.fieldErrors);
      return null;
    }
    return result.message;
  }, [setFieldErrorsFromApi]);

  return {
    errors,
    fieldError,
    setFieldError,
    setFieldErrorsFromApi,
    clearField,
    clearAll,
    applyApiError,
  };
}
