import type { Express, Request, Response } from "express";
import { getUserByOpenId, getUserByEmail, upsertUser } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import crypto from "crypto";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

async function syncUser(userInfo: {
  openId?: string | null;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  platform?: string | null;
}) {
  if (!userInfo.openId) {
    throw new Error("openId missing from user info");
  }

  const lastSignedIn = new Date();
  await upsertUser({
    openId: userInfo.openId,
    name: userInfo.name || "",
    email: userInfo.email ?? "",
    loginMethod: userInfo.loginMethod ?? userInfo.platform ?? "oauth",
    lastSignedIn,
  });
  const saved = await getUserByOpenId(userInfo.openId);
  return (
    saved ?? {
      openId: userInfo.openId,
      name: userInfo.name,
      email: userInfo.email,
      loginMethod: userInfo.loginMethod ?? null,
      lastSignedIn,
    }
  );
}

function buildUserResponse(
  user:
    | Awaited<ReturnType<typeof getUserByOpenId>>
    | {
        openId: string;
        name?: string | null;
        email?: string | null;
        loginMethod?: string | null;
        lastSignedIn?: Date | null;
      },
) {
  return {
    id: (user as any)?.id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? null,
    lastSignedIn: (user?.lastSignedIn ?? new Date()).toISOString(),
  };
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const COOKIE_NAME = "app_session";

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect to the frontend URL (Expo web on port 8081)
      // Cookie is set with parent domain so it works across both 3000 and 8081 subdomains
      const frontendUrl =
        process.env.EXPO_WEB_PREVIEW_URL ||
        process.env.EXPO_PACKAGER_PROXY_URL ||
        "http://localhost:8081";
      res.redirect(302, frontendUrl);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  app.get("/api/oauth/mobile", async (req: Request, res: Response) => {
    try {
      const code = getQueryParam(req, "code");
      const state = getQueryParam(req, "state");

      if (!code || !state) {
        res.status(400).json({ error: "code and state are required" });
        return;
      }

      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      res.json({
        app_session_id: sessionToken,
        user: buildUserResponse(userInfo),
      });
    } catch (error) {
      console.error("[OAuth] Mobile callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  // Anonymous session - no login required
  app.post("/api/auth/anonymous", async (req: Request, res: Response) => {
    try {
      // Create a unique anonymous user ID
      const anonymousId = `anon-${crypto.randomBytes(8).toString("hex")}`;

      // Create session token for anonymous user
      const sessionToken = await sdk.createSessionToken(anonymousId, {
        name: "Anonymous User",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        app_session_id: sessionToken,
        user: {
          id: null,
          openId: anonymousId,
          name: "Anonymous User",
          email: null,
          loginMethod: "anonymous",
          lastSignedIn: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("[Auth] Anonymous session failed:", error);
      res.status(500).json({ error: "Failed to create anonymous session" });
    }
  });

  // Company login - ad, soyad + şifre
  app.post("/api/auth/company-login", async (req: Request, res: Response) => {
    try {
      const { firstName, lastName, password } = req.body;

      if (!firstName || !lastName || !password) {
        res.status(400).json({ error: "First name, last name, and password are required" });
        return;
      }

      // Verify company password
      const companyPassword = process.env.COMPANY_PASSWORD;
      if (!companyPassword) {
        console.error("[Auth] COMPANY_PASSWORD not configured");
        res.status(500).json({ error: "Server configuration error" });
        return;
      }

      if (password !== companyPassword) {
        res.status(401).json({ error: "Invalid password" });
        return;
      }

      // Create or get user with ad-soyad as unique identifier
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.local`;
      const fullName = `${firstName} ${lastName}`;

      let user = await getUserByEmail(email);
      if (!user) {
        // Create new user
        const lastSignedIn = new Date();
        await upsertUser({
          name: fullName,
          email,
          password: "company-auth", // Placeholder, not used for company login
          loginMethod: "company",
          lastSignedIn,
        });
        user = await getUserByEmail(email);
      } else {
        // Update last signed in
        await upsertUser({
          name: fullName,
          email,
          password: "company-auth",
          loginMethod: "company",
          lastSignedIn: new Date(),
        });
        user = await getUserByEmail(email);
      }

      if (!user) {
        res.status(500).json({ error: "Failed to create user session" });
        return;
      }

      // Create session token
      const sessionToken = await sdk.createSessionToken(email, {
        name: fullName,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        app_session_id: sessionToken,
        user: buildUserResponse(user),
      });
    } catch (error) {
      console.error("[Auth] Company login failed:", error);
      res.status(500).json({ error: "Company login failed" });
    }
  });

  // Email/Password signup
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }

      // Check if user already exists
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        res.status(400).json({ error: "Email already registered" });
        return;
      }

      // Create new user
      const lastSignedIn = new Date();
      await upsertUser({
        name: name || "",
        email,
        password,
        loginMethod: "email",
        lastSignedIn,
      });

      const user = await getUserByEmail(email);
      if (!user) {
        res.status(500).json({ error: "Failed to create user" });
        return;
      }

      // Create session token
      const sessionToken = await sdk.createSessionToken(email, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        app_session_id: sessionToken,
        user: buildUserResponse(user),
      });
    } catch (error) {
      console.error("[Auth] Signup failed:", error);
      res.status(500).json({ error: "Signup failed" });
    }
  });

  // Forgot Password - Send Reset Code
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
      }

      const user = await getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists for security
        res.json({ success: true, message: "If email exists, reset code will be sent" });
        return;
      }

      // Generate reset code (in production, store this with expiration)
      const resetCode = crypto.randomBytes(3).toString("hex").toUpperCase();
      console.log(`[Auth] Reset code for ${email}: ${resetCode}`);

      // In production, store resetCode with expiration in database
      // For now, just return success
      res.json({ success: true, message: "Reset code sent to email" });
    } catch (error) {
      console.error("[Auth] Forgot password failed:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  // Reset Password
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { email, code, newPassword } = req.body;

      if (!email || !code || !newPassword) {
        res.status(400).json({ error: "Email, code, and new password are required" });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }

      // In production, verify the reset code and its expiration
      // For now, just accept any code
      const user = await getUserByEmail(email);
      if (!user) {
        res.status(401).json({ error: "Invalid email" });
        return;
      }

      // Update password
      await upsertUser({
        email,
        password: newPassword,
        name: user.name,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error("[Auth] Reset password failed:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  // Get current authenticated user - works with both cookie (web) and Bearer token (mobile)
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/me failed:", error);
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });

  // Establish session cookie from Bearer token
  // Used by iframe preview: frontend receives token via postMessage, then calls this endpoint
  // to get a proper Set-Cookie response from the backend (3000-xxx domain)
  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      // Authenticate using Bearer token from Authorization header
      const user = await sdk.authenticateRequest(req);

      // Get the token from the Authorization header to set as cookie
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const token = authHeader.slice("Bearer ".length).trim();

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        success: true,
        user: buildUserResponse(user),
      });
    } catch (error) {
      console.error("[Auth] Session establishment failed:", error);
      res.status(401).json({ error: "Failed to establish session" });
    }
  });
}
