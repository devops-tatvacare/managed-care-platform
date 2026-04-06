import { apiRequest } from "@/services/api/client";
import { API_ENDPOINTS } from "@/config/api";
import type { LoginRequest, TokenResponse, UserResponse } from "@/services/types/auth";

export async function login(data: LoginRequest): Promise<TokenResponse> {
  return apiRequest<TokenResponse>({
    method: "POST",
    path: API_ENDPOINTS.auth.login,
    body: data,
    skipAuth: true,
  });
}

export async function refreshToken(token: string): Promise<TokenResponse> {
  return apiRequest<TokenResponse>({
    method: "POST",
    path: API_ENDPOINTS.auth.refresh,
    body: { refresh_token: token },
    skipAuth: true,
  });
}

export async function getMe(): Promise<UserResponse> {
  return apiRequest<UserResponse>({
    method: "GET",
    path: API_ENDPOINTS.auth.me,
  });
}
