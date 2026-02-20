import "dotenv/config";
import express from "express";
import { registerRoutes } from "../server/routes";
import { serveStatic } from "../server/static";
import { createServer } from "http";
import { setupAuth } from "../server/auth";

const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

setupAuth(app);

// Routes will be initialized
let routesReady = false;
const initPromise = registerRoutes(httpServer, app).then(() => {
  routesReady = true;
  serveStatic(app);
});

export default async function handler(req: any, res: any) {
  if (!routesReady) await initPromise;
  return app(req, res);
}
