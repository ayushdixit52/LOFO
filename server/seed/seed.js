/**
 * BLUE sample-data seeder.
 * Run from repository root after Member 2's server files are present:
 *   node server/seed/seed.js
 *
 * Uses upserts on the complete sample identity. Re-running this script does
 * not duplicate these sample records and never deletes unrelated reports.
 */
import { readFile } from "node:fs/promises";
import * as reportModule from "../models/Report.js";
import * as dbModule from "../config/db.js";

const Report = reportModule.Report ?? reportModule.default;
const connectDB = dbModule.connectDB;
const disconnectDB = dbModule.disconnectDB;
const DATA_PATH = new URL("./reports.json", import.meta.url);

async function seed() {
  let connected = false;
  try {
    if (!Report || !connectDB || !disconnectDB) {
      throw new Error("Report model or database connection exports were not found.");
    }
    const reports = JSON.parse(await readFile(DATA_PATH, "utf8"));
    if (!Array.isArray(reports) || reports.length !== 150) {
      throw new Error(`Expected exactly 150 reports; received ${reports?.length ?? "invalid data"}`);
    }
    await connectDB();
    connected = true;

    const operations = reports.map((report) => ({
      updateOne: {
        filter: {
          itemName: report.itemName, category: report.category, color: report.color,
          brand: report.brand, location: report.location, date: report.date,
          time: report.time, description: report.description, type: report.type
        },
        update: { $setOnInsert: report },
        upsert: true
      }
    }));
    const result = await Report.bulkWrite(operations, { ordered: false });
    console.log("BLUE seed completed.");
    console.log(`Input: ${reports.length}; inserted: ${result.upsertedCount ?? 0}; already present: ${reports.length - (result.upsertedCount ?? 0)}`);
  } catch (error) {
    console.error("BLUE seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (connected) await disconnectDB();
  }
}
seed();
