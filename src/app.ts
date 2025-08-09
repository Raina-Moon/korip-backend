import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import * as dotenv from "dotenv";
dotenv.config();

import middlewares from "./middlewares/errorHandlers";
import api from "./api";

const app: express.Application = express();

app.use(morgan("dev"));
app.use(helmet());
app.use(
  cors({
    origin: ["https://korips.com"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "🦄🌈✨👋🌎🌍🌏✨🌈🦄",
  });
});

app.use("/api/v1", api);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default app;
