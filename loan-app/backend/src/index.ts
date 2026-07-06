import "dotenv/config";
import { createApp } from "./app.js";
import { getEnv } from "./lib/env.js";
import { logger } from "./lib/logger.js";

const { port } = getEnv();
const app = createApp();

app.listen(port, () => {
  logger.info("server.listening", { port });
  logger.info("server.routes", {
    routes: "POST /callback, POST /portal, GET /portal, GET /health",
  });
});
