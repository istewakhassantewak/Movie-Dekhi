"use strict";

const express = require("express");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const IS_VERCEL = process.env.VERCEL === "1";
const SESSION_SECRET_ENV = process.env.SESSION_SECRET || "";
const IS_PROD = process.env.NODE_ENV === "production";
const TRUST_PROXY = process.env.TRUST_PROXY === "true";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true" || IS_PROD;
const normalizeSameSite = (value) => {
    const normalized = String(value || "lax").trim().toLowerCase();
    if (normalized === "none" || normalized === "strict" || normalized === "lax") {
        return normalized;
    }
    return "lax";
};
const COOKIE_SAME_SITE = normalizeSameSite(process.env.COOKIE_SAME_SITE);
const AUTH_RATE_LIMIT = Number(process.env.AUTH_RATE_LIMIT) || 50;
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || "";
const DATA_DIR = IS_VERCEL ? path.join("/tmp", "moviedekhi-data") : path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSION_SECRET = SESSION_SECRET_ENV || (IS_PROD ? "temporary-insecure-secret" : "local-dev-secret");

if (IS_PROD && !SESSION_SECRET_ENV) {
    console.warn("Warning: SESSION_SECRET is missing in production. Set it in Vercel env vars.");
}

if (TRUST_PROXY) {
    app.set("trust proxy", 1);
}

const ensureDataFile = () => {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]", "utf8");
};

const readUsers = () => {
    ensureDataFile();
    try {
        const raw = fs.readFileSync(USERS_FILE, "utf8");
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch (_error) {
        return [];
    }
};

const writeUsers = (users) => {
    ensureDataFile();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

const dbPool = SUPABASE_DB_URL
    ? new Pool({
        connectionString: SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false }
    })
    : null;

let dbReadyPromise = null;
let dbReadyState = "uninitialized";
const ensureDbReady = async () => {
    if (!dbPool) return false;
    if (!dbReadyPromise) {
        dbReadyState = "checking";
        dbReadyPromise = dbPool.query(`
            CREATE TABLE IF NOT EXISTS auth_users (
                id BIGSERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `).then(() => {
            dbReadyState = "ready";
            return true;
        }).catch((_error) => {
            dbReadyState = "error";
            return false;
        });
    }
    return dbReadyPromise;
};

const findUserByEmail = async (email) => {
    const hasDb = await ensureDbReady();
    if (hasDb) {
        const result = await dbPool.query(
            "SELECT email, password_hash AS \"passwordHash\", created_at AS \"createdAt\" FROM auth_users WHERE email = $1 LIMIT 1",
            [email]
        );
        return result.rows[0] || null;
    }
    const users = readUsers();
    return users.find((user) => user.email === email) || null;
};

const createUser = async (email, passwordHash) => {
    const hasDb = await ensureDbReady();
    if (hasDb) {
        await dbPool.query(
            "INSERT INTO auth_users (email, password_hash) VALUES ($1, $2)",
            [email, passwordHash]
        );
        return;
    }
    const users = readUsers();
    users.push({ email, passwordHash, createdAt: new Date().toISOString() });
    writeUsers(users);
};

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "https:", "data:"],
            mediaSrc: ["'self'", "https:"],
            styleSrc: ["'self'"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https:", "data:"]
        }
    }
}));

app.use(express.json({ limit: "16kb" }));
app.use(session({
    name: "moviedekhi.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: COOKIE_SAME_SITE,
        secure: COOKIE_SECURE,
        maxAge: 1000 * 60 * 60 * 24
    }
}));

const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: AUTH_RATE_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests. Please try again later." }
});

app.get("/api/auth/session", (req, res) => {
    const userEmail = req.session.userEmail || null;
    res.json({ authenticated: Boolean(userEmail), userEmail });
});

app.get("/api/health", async (_req, res) => {
    const usingSupabase = Boolean(dbPool);
    const dbConnected = usingSupabase ? await ensureDbReady() : false;

    res.status(200).json({
        status: "ok",
        service: "MovieDekhi",
        environment: IS_PROD ? "production" : "development",
        usingSupabase,
        dbConnected,
        dbState: usingSupabase ? dbReadyState : "disabled",
        configWarnings: [
            ...(IS_PROD && !SESSION_SECRET_ENV ? ["SESSION_SECRET is missing"] : []),
            ...(COOKIE_SAME_SITE === "none" && !COOKIE_SECURE ? ["COOKIE_SAME_SITE=none requires COOKIE_SECURE=true"] : [])
        ],
        timestamp: new Date().toISOString()
    });
});

app.post("/api/auth/signup", authLimiter, async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Enter a valid email for sign up." });
    }
    if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
        return res.status(409).json({ message: "Account already exists. Please sign in." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await createUser(email, passwordHash);
    req.session.userEmail = email;
    return res.status(201).json({ message: "Sign up successful.", userEmail: email });
});

app.post("/api/auth/signin", authLimiter, async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Enter a valid email for sign in." });
    }
    if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const account = await findUserByEmail(email);
    if (!account) {
        return res.status(404).json({ message: "No account found. Please sign up first." });
    }

    const valid = await bcrypt.compare(password, account.passwordHash);
    if (!valid) {
        return res.status(401).json({ message: "Incorrect password. Try again." });
    }

    req.session.userEmail = email;
    return res.json({ message: "Sign in successful.", userEmail: email });
});

app.post("/api/auth/signout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("moviedekhi.sid");
        res.json({ message: "Signed out successfully." });
    });
});

app.use(express.static(__dirname, { index: "index.html" }));
app.use((_req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

if (!IS_VERCEL) {
    app.listen(PORT, () => {
        console.log(`MovieDekhi running at http://localhost:${PORT}`);
    });
}

module.exports = app;
