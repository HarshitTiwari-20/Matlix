import express from "express";
import { authRouter } from "./routes/auth.routes";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use("/api/v1/auth", authRouter);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

