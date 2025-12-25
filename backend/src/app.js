import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import dropsRouter from "./routes/drops.js";
import usersRouter from "./routes/users.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../uploads");

export const app = express();

app.use(cors());
app.use(express.json());
// serve local media when S3 is not configured
app.use("/uploads", express.static(uploadsDir));

app.use("/drops", dropsRouter);
app.use("/users", usersRouter);
