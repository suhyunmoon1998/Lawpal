import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "lawpel_session";
export type AppUserRole = "FIRM_ADMIN" | "ATTORNEY" | "PARALEGAL" | "STAFF" | "READ_ONLY";

export type SessionUser = {
  userId: string;
  lawFirmId: string;
  email: string;
  role: AppUserRole;
  name: string;
};

function getSecret() {
  const secret = process.env.JWT_SECRET ?? "development-secret-change-me";
  return new TextEncoder().encode(secret);
}

export async function signSession(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecret());
}

export async function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, getSecret());
    return verified.payload as SessionUser;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSessionUser();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireApiSession() {
  const session = await getSessionUser();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}

export function canApprove(role: AppUserRole) {
  return role === "ATTORNEY" || role === "FIRM_ADMIN";
}
