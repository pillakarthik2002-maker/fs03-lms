require("dotenv").config();
const quizRoutes = require("./routes/quizzes");
const express = require("express");
const connectDB = require("./config/db");
const courseRoutes = require("./routes/courses");
const authRoutes = require("./routes/auth");
const path = require("path");
const liveClassRoutes = require("./routes/liveClasses");
const certificateRoutes = require("./routes/certificates");
const app = express();
const paymentRoutes = require("./routes/payments");
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/live-classes", liveClassRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/payments", paymentRoutes);
const PORT = 5000;

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "FS-03 LMS API is running" });
});

async function startServer() {
  await connectDB();
  require("./queues/videoWorker");

  app.listen(PORT, () => {
    console.log(`API listening at http://localhost:${PORT}`);
  });
}

startServer();