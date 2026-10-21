import { apiRequest } from "../api/client";

interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface CurrentUser {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const body = new URLSearchParams();

  body.append("username", email);
  body.append("password", password);

  const response = await apiRequest<LoginResponse>(
    "/auth/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    }
  );

  localStorage.setItem("access_token", response.access_token);

  return response;
}

export function logout(): void {
  localStorage.removeItem("access_token");
}

export function isAuthenticated(): boolean {
  return Boolean(localStorage.getItem("access_token"));
}

export async function getCurrentUser(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>("/auth/me");
}
