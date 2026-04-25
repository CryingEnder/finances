import bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AUTH_CONFIG } from "./config";
import { getUsersCollection } from "./database";
import { type User, type LoginCredentials } from "./types";

export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

export function generateJWT(user: User): string {
  if (!AUTH_CONFIG.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
  }

  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
    },
    AUTH_CONFIG.JWT_SECRET,
    { expiresIn: AUTH_CONFIG.JWT_EXPIRES_IN },
  );
}

export function verifyJWT(token: string): User | null {
  try {
    if (!AUTH_CONFIG.JWT_SECRET) {
      throw new Error("JWT_SECRET environment variable is required");
    }

    const decodedToken = jwt.verify(token, AUTH_CONFIG.JWT_SECRET);
    if ("object" !== typeof decodedToken) {
      return null;
    }

    const payload = decodedToken as Record<string, unknown>;
    const userId = payload.userId;
    const email = payload.email;
    const name = payload.name;

    if (
      "string" !== typeof userId ||
      "string" !== typeof email ||
      "string" !== typeof name
    ) {
      return null;
    }

    return {
      id: userId,
      email,
      name,
    };
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_CONFIG.COOKIE_NAME, token, {
    httpOnly: true,
    secure: "production" === process.env.NODE_ENV,
    sameSite: "strict",
    maxAge: AUTH_CONFIG.COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function getAuthCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_CONFIG.COOKIE_NAME)?.value || null;
}

export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_CONFIG.COOKIE_NAME);
}

export async function getCurrentUser(): Promise<User | null> {
  const token = await getAuthCookie();
  if (!token) {
    return null;
  }

  return verifyJWT(token);
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }
  return user;
}

export async function authenticateUser(
  credentials: LoginCredentials,
): Promise<User | null> {
  try {
    const usersCollection = await getUsersCollection();
    const user = await usersCollection.findOne({ email: credentials.email });

    if (!user) {
      return null;
    }

    const isValidPassword = await verifyPassword(
      credentials.password,
      user.password,
    );

    if (!isValidPassword) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}
