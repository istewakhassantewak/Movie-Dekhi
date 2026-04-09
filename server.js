"use strict";

const express = require("express");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || "change-this-secret-in-production";
const IS_PROD = process.env.NODE_ENV === "production";
const TRUST_PROXY = process.env.TRUST_PROXY === "true";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true" || IS_PROD;
const COOKIE_SAME_SITE = process.env.COOKIE_SAME_SITE || "lax";
const AUTH_RATE_LIMIT = Number(process.env.AUTH_RATE_LIMIT) || 50;
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

if (IS_PROD && SESSION_SECRET === "change-this-secret-in-production") {
    throw new Error("SESSION_SECRET must be set in production.");
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

app.post("/api/auth/signup", authLimiter, async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Enter a valid email for sign up." });
    }
    if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const users = readUsers();
    const exists = users.some((user) => user.email === email);
    if (exists) {
        return res.status(409).json({ message: "Account already exists. Please sign in." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    users.push({ email, passwordHash, createdAt: new Date().toISOString() });
    writeUsers(users);
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

    const users = readUsers();
    const account = users.find((user) => user.email === email);
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

app.listen(PORT, () => {
    console.log(`MovieDekhi running at http://localhost:${PORT}`);
});
