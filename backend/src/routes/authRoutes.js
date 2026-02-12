import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";
import crypto from "crypto";

const router = express.Router();

function generateAccessToken(userId) {
    return jwt.sign({ id: userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "5m" });
}

function generateRefreshToken(userId, jti) {
    return jwt.sign({ id: userId, jti }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "1d" });
}


router.post("/register", (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password || !email) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const hashedPassword = bcrypt.hashSync(password, 8);

    try {
        const stmt = db.prepare("INSERT INTO users (username, password, email) VALUES (?, ?, ?)");
        const result = stmt.run(username, hashedPassword, email);
        const userId = result.lastInsertRowid;

        const insertTodo = db.prepare("INSERT INTO todos (user_id, content) VALUES (?, ?)");
        insertTodo.run(userId, "Hello! Welcome to your to-do list.");

        const insertBranch = db.prepare("INSERT INTO branches (user_id, name) VALUES (?, ?)");
        const branchResult = insertBranch.run(userId, "Root Branch");
        const rootBranchId = branchResult.lastInsertRowid;

        const insertNode = db.prepare(`
            INSERT INTO nodes (user_id, branch_id, name, x, y, role)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        insertNode.run(userId, rootBranchId, "Root Node", 80, 120, "root");

        const accessToken = generateAccessToken(userId);
        const jti = crypto.randomUUID();
        const refreshToken = generateRefreshToken(userId, jti);
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
        const storeToken = db.prepare("INSERT INTO refresh_tokens (user_id, jti, expires_at) VALUES (?, ?, ?)");
        storeToken.run(userId, jti, expiresAt);

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            maxAge: 24 * 60 * 60 * 1000
        });

        return res.status(201).json({ accessToken });

    } catch (err) {
        console.log(err.message);
        return res.status(503).json({ message: "Server error" });
    }
});


router.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
    }

    try {
        const getUser = db.prepare("SELECT * FROM users WHERE username = ?");
        const user = getUser.get(username);

        if (!user) return res.status(404).json({ message: "User not found" });

        const passwordIsValid = bcrypt.compareSync(password, user.password);
        if (!passwordIsValid) return res.status(401).json({ message: "Invalid password" });

        const accessToken = generateAccessToken(user.id);
        const jti = crypto.randomUUID();
        const refreshToken = generateRefreshToken(user.id, jti);

        const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
        const storeToken = db.prepare("INSERT INTO refresh_tokens (user_id, jti, expires_at) VALUES (?, ?, ?)");
        storeToken.run(user.id, jti, expiresAt);

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({ accessToken });

    } catch (err) {
        console.log(err.message);
        return res.status(503).json({ message: "Server error" });
    }
});


router.post("/refresh", (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: "No token provided" });

    try {
        const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

        const getToken = db.prepare("SELECT * FROM refresh_tokens WHERE jti = ?");
        const dbToken = getToken.get(payload.jti);
        if (!dbToken || dbToken.expires_at < Date.now()) {
            return res.status(403).json({ message: "Invalid or expired refresh token" });
        }

        const accessToken = generateAccessToken(payload.id);
        res.json({ accessToken });

    } catch (err) {
        console.log(err.message);
        res.status(403).json({ message: "Invalid refresh token" });
    }
});

router.post("/logout", (req, res) => {
    const token = req.cookies.refreshToken;
    if (token) {
        try {
            const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
            const deleteToken = db.prepare("DELETE FROM refresh_tokens WHERE jti = ?");
            deleteToken.run(payload.jti);
        } catch (err) {
            console.log("Logout token invalid:", err.message);
        }
    }

    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict"
    });

    res.json({ message: "Logged out successfully" });
});

export default router;
