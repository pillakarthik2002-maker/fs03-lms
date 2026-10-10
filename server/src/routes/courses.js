const express = require("express");
const Course = require("../models/course");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const courses = await Course.find({ status: "published" }).sort({
      createdAt: -1,
    });

    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: "Could not load courses" });
  }
});

module.exports = router;