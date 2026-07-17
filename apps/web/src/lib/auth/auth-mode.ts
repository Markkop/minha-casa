export type AuthMode = "login" | "signup";

export function resolveAuthMode(pathname: string): AuthMode {
  return pathname === "/signup" ? "signup" : "login";
}
