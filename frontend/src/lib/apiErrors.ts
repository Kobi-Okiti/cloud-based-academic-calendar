import type { AxiosResponse } from "axios";

type ApiErrorShape = {
  error?: string;
  message?: string;
};

export function getApiErrorMessage(
  response: AxiosResponse | null | undefined,
  fallback: string
) {
  const data = response?.data as ApiErrorShape | undefined;
  return data?.error || data?.message || fallback;
}

export function assertOk<T>(
  response: AxiosResponse<T>,
  fallback: string
): AxiosResponse<T> {
  if (response.status >= 400) {
    throw new Error(getApiErrorMessage(response, fallback));
  }
  return response;
}
