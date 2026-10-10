const express = require("express");

const app = express();
const PORT = 5000;

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "FS-03 LMS API is running" });
});

app.listen(PORT, () => {
  console.log(`API listening at http://localhost:${PORT}`);
});