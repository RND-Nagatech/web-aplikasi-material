import { apiClient, tokenStorage } from "@/lib/api-client";
import { unwrapData, type ApiEnvelope } from "@/lib/api-response";
import type { AuthUser, LoginResponse, RegisterInput } from "@/types";

export const authService = {
  login: async (email: string, password: string) => {
    const { data } = await apiClient.post<ApiEnvelope<LoginResponse>>("/auth/login", {
      email,
      password,
    });
    const result = unwrapData(data);
    tokenStorage.set(result.token);
    return result;
  },
  register: async (input: RegisterInput) => {
    const { data } = await apiClient.post<ApiEnvelope<LoginResponse>>("/auth/register", input);
    const result = unwrapData(data);
    tokenStorage.set(result.token);
    return result;
  },
  me: () =>
    apiClient
      .get<ApiEnvelope<AuthUser>>("/auth/me")
      .then((r) => unwrapData(r.data)),
  logout: () => {
    tokenStorage.clear();
  },
};
