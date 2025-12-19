import bcrypt from "bcrypt";
import { findDropByDropId } from "../repositories/dropRepo.js";

export async function validateDropPasscode(dropId, passcode) {
  const drop = await findDropByDropId(dropId);

  if (!drop) {
    return { valid: false, reason: "DROP_NOT_FOUND" };
  }

  if (!drop.is_live) {
    return { valid: false, reason: "DROP_NOT_LIVE" };
  }

  if (drop.release_at && new Date(drop.release_at) > new Date()) {
    return { valid: false, reason: "DROP_NOT_RELEASED" };
  }

  if (drop.expires_at && new Date(drop.expires_at) <= new Date()) {
    return { valid: false, reason: "DROP_EXPIRED" };
  }

  const ok = await bcrypt.compare(passcode, drop.passcode_hash);
  if (!ok) {
    return { valid: false, reason: "INVALID_PASSCODE" };
  }

  return { valid: true, drop };
}
