import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import featureRoutes from "./routes/featureRoutes.js";
import dotenv from "dotenv";
import authMiddleware from "./middleware/authMiddleware.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "..", "..", "frontend");
app.use(express.static(frontendPath));
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "main.html"));
});

// Routes

app.use(`/auth`, authRoutes);
app.use(`/feature`, authMiddleware, featureRoutes);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
