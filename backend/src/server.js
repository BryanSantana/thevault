import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import dropsRouter from "./routes/drops.js";
import adminRouter from "./routes/admin.js";
import { assertDbConnection } from "./config/db.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.use("/drops", dropsRouter);
app.use("/admin", adminRouter);

if (process.env.NODE_ENV !== "test") {
  await assertDbConnection();
  app.listen(process.env.PORT, () =>
    console.log("Vault backend running")
  );
}
