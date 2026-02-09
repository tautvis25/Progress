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


router.get("/branches/", (req, res) => {
    console.log("UserId in request:", req.userId);
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
        const stmt = db.prepare("SELECT id, name FROM branches WHERE user_id = ?");
        const branches = stmt.all(req.userId);
        console.log("Branches fetched:", branches);
        res.json(branches);
    } catch (err) {
        console.error("Error fetching branches:", err);
        res.status(500).json({ message: "Server error" });
    }
});



router.post("/branches", (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Name required" });
    try {
        const stmt = db.prepare("INSERT INTO branches (user_id, name) VALUES (?, ?)");
        const result = stmt.run(req.userId, name);
        res.status(201).json({ id: result.lastInsertRowid, name });
    } catch {
        res.status(500).json({ message: "Server error" });
    }
});

router.delete("/branches/:branchId", (req, res) => {
    const { branchId } = req.params;
    try {
        const stmt = db.prepare("DELETE FROM branches WHERE id = ? AND user_id = ?");
        const result = stmt.run(branchId, req.userId);
        if (result.changes === 0) return res.status(404).json({ message: "Branch not found" });
        res.json({ message: "Branch deleted" });
    } catch {
        res.status(500).json({ message: "Server error" });
    }
});

router.get("/branches/:branchId/nodes", (req, res) => {
    const { branchId } = req.params;
    try {
        const stmt = db.prepare("SELECT id, name, x, y FROM nodes WHERE user_id = ? AND branch_id = ?");
        const nodes = stmt.all(req.userId, branchId);
        res.json(nodes);
    } catch {
        res.status(500).json({ message: "Server error" });
    }
});

router.post("/branches/:branchId/nodes", (req, res) => {
    const { branchId } = req.params;
    const { name, x, y } = req.body;
    if (!name) return res.status(400).json({ message: "Name required" });
    try {
        const stmt = db.prepare("INSERT INTO nodes (user_id, branch_id, name, x, y) VALUES (?, ?, ?, ?, ?)");
        const result = stmt.run(req.userId, branchId, name, x || 0, y || 0);
        res.status(201).json({ id: result.lastInsertRowid, name, x: x || 0, y: y || 0 });
    } catch {
        res.status(500).json({ message: "Server error" });
    }
});

router.put("/branches/:branchId/nodes/:nodeId", (req, res) => {
    const { branchId, nodeId } = req.params;
    const { name, x, y } = req.body;
    try {
        const stmt = db.prepare(`
            UPDATE nodes SET
                name = COALESCE(?, name),
                x = COALESCE(?, x),
                y = COALESCE(?, y)
            WHERE id = ? AND branch_id = ? AND user_id = ?
        `);
        const result = stmt.run(name, x, y, nodeId, branchId, req.userId);
        if (result.changes === 0) return res.status(404).json({ message: "Node not found" });
        res.json({ message: "Node updated" });
    } catch {
        res.status(500).json({ message: "Server error" });
    }
});

router.delete("/branches/:branchId/nodes/:nodeId", (req, res) => {
    const { branchId, nodeId } = req.params;
    try {
        const stmt = db.prepare("DELETE FROM nodes WHERE id = ? AND branch_id = ? AND user_id = ?");
        const result = stmt.run(nodeId, branchId, req.userId);
        if (result.changes === 0) return res.status(404).json({ message: "Node not found" });
        res.json({ message: "Node deleted" });
    } catch {
        res.status(500).json({ message: "Server error" });
    }
});

router.get("/branches/:branchId/connections/", (req, res) => {
    const { branchId } = req.params;
    try {
        const stmt = db.prepare(`
            SELECT id, from_node AS from_node_id, to_node AS to_node_id
            FROM connections
            WHERE user_id = ? AND branch_id = ?
        `);
        const connections = stmt.all(req.userId, branchId);
        res.json(connections);
    } catch (err) {
        console.error("Error fetching connections:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});



router.post("/branches/:branchId/connections", (req, res) => {
    const { branchId } = req.params;
    const { from, to } = req.body;
    if (from == null || to == null) return res.status(400).json({ message: "From and to required" });
    try {
        const stmt = db.prepare("INSERT INTO connections (user_id, branch_id, from_node, to_node) VALUES (?, ?, ?, ?)");
        const result = stmt.run(req.userId, branchId, from, to);
        res.status(201).json({ id: result.lastInsertRowid, from, to });
    } catch {
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
