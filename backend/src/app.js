import express from "express";
import cors from "cors";

import dropsRouter from "./routes/drops.js";


export const app = express();

app.use(cors());
app.use(express.json());

app.use("/drops", dropsRouter);
