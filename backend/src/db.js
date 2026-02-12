import {DatabaseSync} from "node:sqlite";

const db = new DatabaseSync(":memory:");

db.exec(`
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        email TEXT UNIQUE
    )
`)

db.exec(`
    CREATE TABLE todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        content TEXT,
        completed BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`)

db.exec(`
    CREATE TABLE branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`)

db.exec(`
    CREATE TABLE nodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        branch_id INTEGER,
        name TEXT,
        x INTEGER DEFAULT 0,
        y INTEGER DEFAULT 0,
        role TEXT DEFAULT 'default',
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(branch_id) REFERENCES branches(id)
    )
`)

db.exec(`
    CREATE TABLE refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        jti TEXT UNIQUE,
        expires_at INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`)

db.exec(`
CREATE TABLE connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER,
    from_node_id INTEGER,
    to_node_id INTEGER,
    FOREIGN KEY(branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY(from_node_id) REFERENCES nodes(id) ON DELETE CASCADE,
    FOREIGN KEY(to_node_id) REFERENCES nodes(id) ON DELETE CASCADE
);
`);



export default db;