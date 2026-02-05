import express from "express";
import db from "../db.js";

const router = express.Router();

router.get("/todo/", (req, res) => {
    try {
        const getTodos = db.prepare("SELECT * FROM todos WHERE user_id = ?");
        const todos = getTodos.all(req.userId);
        res.json(todos);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server error" });
    }
});

router.post("/todo/", (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: "Content required" });

    try {
        const insertTodo = db.prepare("INSERT INTO todos (user_id, content) VALUES (?, ?)");
        const result = insertTodo.run(req.userId, content);
        const newTodo = { id: result.lastInsertRowid, user_id: req.userId, content, completed: 0 };
        res.status(201).json(newTodo);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server error" });
    }
});

router.put("/todo/:id", (req, res) => {
    const { id } = req.params;
    const { completed } = req.body;

    try {
        const updateTodo = db.prepare("UPDATE todos SET completed = ? WHERE id = ? AND user_id = ?");
        const result = updateTodo.run(completed ? 1 : 0, id, req.userId);
        if (result.changes === 0) return res.status(404).json({ message: "Todo not found" });
        res.json({ message: "Todo updated" });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server error" });
    }
});

router.delete("/todo/:id", (req, res) => {
    const { id } = req.params;

    try {
        const deleteTodo = db.prepare("DELETE FROM todos WHERE id = ? AND user_id = ?");
        const result = deleteTodo.run(id, req.userId);
        if (result.changes === 0) return res.status(404).json({ message: "Todo not found" });
        res.json({ message: "Todo deleted" });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
