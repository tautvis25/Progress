import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";

const router = express.Router();

router.post("/register", (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password || !email) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const hashedPassword = bcrypt.hashSync(password, 8);

    try {  
        const stmt = db.prepare("INSERT INTO users (username, password, email) VALUES (?, ?, ?)");
        const result = stmt.run(username, hashedPassword, email);

        const defaultTodo = "Hello! Welcome to your to-do list. Edit or delete this item to get started.";
        const insertTodo = db.prepare("INSERT INTO todos (user_id, content) VALUES (?, ?)");
        insertTodo.run(result.lastInsertRowid, defaultTodo);


        const token = jwt.sign({ id: result.lastInsertRowid }, process.env.JWT_SECRET, { expiresIn: '24h' });
        return res.status(201).json({ token });

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

        if (!user) {return res.status(404).send({message: "User not found"})}

        const passwordIsValid = bcrypt.compareSync(password, user.password)

        if (!passwordIsValid) {return res.status(401).send({message: "Invalid password"})}

        console.log(user)
        const token = jwt.sign({id: user.id}, process.env.JWT_SECRET, { expiresIn: "24h"})
        res.json({ token })

    } catch (err) {
        console.log(err.message);
        return res.status(503).json({ message: "Server error" });
    }


});

export default router;