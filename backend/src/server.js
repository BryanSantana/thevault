import dotenv from "dotenv";
dotenv.config();

import { app } from "./app.js";
import { assertDbConnection } from "./config/db.js";

const PORT = process.env.PORT || 4000;

await assertDbConnection();

app.listen(PORT, () => {
  console.log(`Vault backend running on port ${PORT}`);
});

