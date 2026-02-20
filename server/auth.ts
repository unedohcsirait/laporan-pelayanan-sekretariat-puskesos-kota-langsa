import bcrypt from "bcryptjs";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { type Express, type Request, type Response, type NextFunction } from "express";
import { db, pool } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import connectPgSimple from "connect-pg-simple";

// Safe user type without password
interface SafeUser {
  id: number;
  username: string;
  createdAt: Date;
}

// Extend express-session / passport types
declare global {
  namespace Express {
    interface User extends SafeUser {}
  }
}

export function setupAuth(app: Express) {
  const PgStore = connectPgSimple(session);
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    throw new Error("SESSION_SECRET must be set");
  }

  // Vercel sits behind a proxy, so we need to trust it for secure cookies
  app.set("trust proxy", 1);

  app.use(
    session({
      store: new PgStore({ pool, createTableIfMissing: true }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db.select().from(users).where(eq(users.username, username));
        if (!user) {
          return done(null, false, { message: "Username atau password salah" });
        }
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Username atau password salah" });
        }
        const safeUser: SafeUser = { id: user.id, username: user.username, createdAt: user.createdAt };
        return done(null, safeUser);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, (user as SafeUser).id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (!user) return done(null, false as any);
      const safeUser: SafeUser = { id: user.id, username: user.username, createdAt: user.createdAt };
      done(null, safeUser);
    } catch (err) {
      done(err);
    }
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Unauthorized" });
}

export async function seedAdminUser() {
  const [existing] = await db.select().from(users).where(eq(users.username, "admin"));
  if (!existing) {
    const hashed = await bcrypt.hash("admin123", 10);
    await db.insert(users).values({ username: "admin", password: hashed });
    console.log("[auth] Default user created: admin / admin123");
  }
}
