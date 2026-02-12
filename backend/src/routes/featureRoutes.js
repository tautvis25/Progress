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
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
        const stmt = db.prepare("SELECT id, name FROM branches WHERE user_id = ?");
        const branches = stmt.all(req.userId);
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
        const stmt = db.prepare("SELECT id, name, x, y, role FROM nodes WHERE user_id = ? AND branch_id = ?");
        const nodes = stmt.all(req.userId, branchId);
        res.json(nodes);
    } catch {
        res.status(500).json({ message: "Server error" });
    }
});

router.post("/branches/:branchId/nodes", (req, res) => {
    const { branchId } = req.params;
    const { name, x, y, role } = req.body;
    if (!name) return res.status(400).json({ message: "Name required" });

    try {
        const stmt = db.prepare("INSERT INTO nodes (user_id, branch_id, name, x, y, role) VALUES (?, ?, ?, ?, ?, ?)");
        const result = stmt.run(req.userId, branchId, name, x || 0, y || 0, role || "root");
        res.status(201).json({ id: result.lastInsertRowid, name, x: x || 0, y: y || 0, role: role || "root" });
    } catch {
        res.status(500).json({ message: "Server error" });
    }
});

router.put("/branches/:branchId/nodes/:nodeId", (req, res) => {
    const { branchId, nodeId } = req.params;
    const { name, x, y, role } = req.body;

    try {
        const updates = [];
        const params = [];

        if (name !== undefined) { updates.push("name = ?"); params.push(name); }
        if (x !== undefined) { updates.push("x = ?"); params.push(x); }
        if (y !== undefined) { updates.push("y = ?"); params.push(y); }
        if (role !== undefined) { updates.push("role = ?"); params.push(role); }

        if (updates.length === 0) return res.status(400).json({ message: "Nothing to update" });

        params.push(nodeId, branchId, req.userId);

        const stmt = db.prepare(`UPDATE nodes SET ${updates.join(", ")} WHERE id = ? AND branch_id = ? AND user_id = ?`);
        const result = stmt.run(...params);

        if (result.changes === 0) return res.status(404).json({ message: "Node not found" });

        const updatedNode = db.prepare("SELECT id, name, x, y, role FROM nodes WHERE id = ?").get(nodeId);
        res.json(updatedNode);
    } catch (err) {
        console.error(err.message);
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

router.get("/branches/:branchId/connections", (req, res) => {
    const { branchId } = req.params;

    try {
        const branchCheck = db.prepare(
            "SELECT id FROM branches WHERE id = ? AND user_id = ?"
        ).get(branchId, req.userId);

        if (!branchCheck)
            return res.status(404).json({ message: "Branch not found" });

        const stmt = db.prepare(`
            SELECT id, from_node_id, to_node_id
            FROM connections
            WHERE branch_id = ?
        `);

        const connections = stmt.all(branchId);
        res.json(connections);

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server error" });
    }
});

router.post("/branches/:branchId/connections", (req, res) => {
    const { branchId } = req.params;
    const { from, to } = req.body;

    if (from == null || to == null)
        return res.status(400).json({ message: "From and to required" });

    try {
        const stmt = db.prepare(`
            INSERT INTO connections (branch_id, from_node_id, to_node_id)
            VALUES (?, ?, ?)
        `);

        const result = stmt.run(branchId, from, to);

        res.status(201).json({
            id: result.lastInsertRowid,
            from_node_id: from,
            to_node_id: to
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server error" });
    }
});


export default router;
