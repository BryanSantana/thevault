import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../src/server.js";
import { db } from "../src/config/db.js";
import { resetDb } from "../src/testUtils/resetDB.js";

beforeEach(async () => {
  await resetDb();

  const passcodeHash = await bcrypt.hash("vault123", 10);

  const dropRes = await db.query(
    `
    INSERT INTO drops (drop_id, title, passcode_hash)
    VALUES ($1, $2, $3)
    RETURNING id
    `,
    ["drop_001_test_1", "Test Album", passcodeHash]
  );

  await db.query(
    `
    INSERT INTO media (drop_id, s3_key, media_type, position)
    VALUES ($1, $2, $3, $4)
    `,
    [
      dropRes.rows[0].id,
      "drops/drop_001_test_1/photos/test.jpg",
      "photo",
      1,
    ]
  );
});

test("unlocking a drop with correct passcode returns media", async () => {
  const res = await request(app)
    .post("/drops/drop_001_test_1/unlock")
    .send({ passcode: "vault123" });

  expect(res.statusCode).toBe(200);
  expect(res.body.count).toBe(1);
  expect(res.body.media[0].url).toContain("mock-s3");
});

test("wrong passcode is rejected", async () => {
  const res = await request(app)
    .post("/drops/drop_001_test_1/unlock")
    .send({ passcode: "wrong" });

  expect(res.statusCode).toBe(403);
});
