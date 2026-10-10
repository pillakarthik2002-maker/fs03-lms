require("dotenv").config();

const express = require("express");
const connectDB = require("./config/db");
const courseRoutes = require("./routes/courses");
const authRoutes = require("./routes/auth");

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
const PORT = 5000;

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "FS-03 LMS API is running" });
});

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`API listening at http://localhost:${PORT}`);
  });
}

startServer();