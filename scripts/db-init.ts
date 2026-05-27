import "dotenv/config";
import { initDb } from "../src/server/db/index";

await initDb();
console.log("Ticket Radar database schema initialized.");
