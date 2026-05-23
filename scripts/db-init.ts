import "dotenv/config";
import { initDb, seedDb } from "../src/server/db.js";

initDb();
seedDb();
console.log("Ticket Radar database initialized.");
