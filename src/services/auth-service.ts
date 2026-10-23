import { setSessionTokens } from "@/lib/auth/session";
import { api, ApiRequestError } from "@/lib/api/server";

interface AuthResponse {
  user: { id: string; email: string };
  accessToken: string;
  refreshToken: string;
}

export async function signUp(email: string, password: string) {
  try {
    const data = await api<AuthResponse>("/auth/signup", { method: "POST", body: { email, password }, auth: false });
    await setSessionTokens(data);
    return { userId: data.user.id, email: data.user.email, needsEmailConfirmation: false };
  } catch (error) {
    if (error instanceof ApiRequestError) return { error: error.message };
    // Not an API answer — usually the API is unreachable (check NEXT_PUBLIC_API_URL).
    console.error("Sign-up failed:", error);
    return { error: "Could not create account." };
  }
}

/** Creates (or upgrades) an admin account; the API checks the admin code. */
export async function signUpAdmin(email: string, password: string, code: string) {
  try {
    const data = await api<AuthResponse>("/auth/signup-admin", { method: "POST", body: { email, password, code }, auth: false });
    await setSessionTokens(data);
    return { userId: data.user.id, email: data.user.email };
  } catch (error) {
    if (error instanceof ApiRequestError) return { error: error.message };
    console.error("Admin sign-up failed:", error);
    return { error: "Could not create the admin account." };
  }
}

export async function signIn(email: string, password: string) {
  try {
    const data = await api<AuthResponse>("/auth/signin", { method: "POST", body: { email, password }, auth: false });
    await setSessionTokens(data);
    return { userId: data.user.id, email: data.user.email };
  } catch (error) {
    if (!(error instanceof ApiRequestError)) console.error("Sign-in failed:", error);
    return { error: "Incorrect email or password." };
  }
}
