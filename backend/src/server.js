import dotenv from "dotenv";
dotenv.config();


import express from "express";
import cors from "cors";
import dropsRouter from "./routes/drops.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "Vault backend is alive 🗄️" });
});

app.use("/drops", dropsRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Vault backend running on port ${PORT}`);
});

export default app;