import "dotenv/config";
import express from "express";
import { registerRoutes } from "../server/routes";
import { createServer } from "http";
import { setupAuth } from "../server/auth";

const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

setupAuth(app);

// Initialize routes once and reuse (handles cold starts)
let initDone = false;
const initPromise = registerRoutes(httpServer, app).then(() => {
  initDone = true;
});

export default async function handler(req: any, res: any) {
  if (!initDone) await initPromise;
  return app(req, res);
}
