import express from "express";
import { PORT } from "./config/envs";
import folderRouter from "./utils/folderRouter";
import path from "path";
import { logger } from "./config/logger";
import { MONGO_CONNECTION_STRING } from "./config/envs";
import mongoose from "mongoose";
import cors from "cors";

import "./models/WebappKeys.model";
import statusPageService from "./services/statuspage.service";

const app = express();

app.use(logger);
app.use(express.json({ limit: "50mb" }));
app.use(
  cors({
    origin: "*",
  })
);

mongoose.connect(MONGO_CONNECTION_STRING).then(() => {
  console.info("Connected to MongoDB");

  folderRouter(app, path.resolve(__dirname, "./routes")).then(() => {
    app.use("*", (req, res) => {
      // 404 -- When no route is matched
      res.status(404).json({ message: "Route not found" });
    });

    app.use((err, req, res, next) => {
      if (err instanceof URIError) {
        return res.status(400).json({ message: "Invalid URI" });
      }
      console.error(err);

      statusPageService.createEndpointIncident({
        method: req.method,
        path: req.path,
        message: err.message || "Internal server error",
      });
      // 500 -- When an error is thrown
      res.status(500).json({ message: "Internal server error" });
    });

    app.listen(PORT, () =>
      console.info(`App listening at port http://localhost:${PORT}`)
    );
  });
});
