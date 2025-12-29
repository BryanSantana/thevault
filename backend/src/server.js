import { app } from "./app.js";
import { assertDbConnection } from "./config/db.js";
import { ensureDropAuxColumns } from "./repositories/dropRepo.js";
import { ensureUserColumns } from "./repositories/userRepo.js";

const PORT = process.env.PORT || 4000;

await assertDbConnection();
await ensureUserColumns();
await ensureDropAuxColumns();

app.listen(PORT, () => {
  console.log(`Vault backend running on port ${PORT}`);
});
