const express = require("express");
const Course = require("../models/course");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");
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

router.post("/", requireAuth, requireRole("instructor", "admin"), async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Course title is required" });
    }

    const course = await Course.create({
      title: title.trim(),
      description: description || "",
      instructorId: req.user._id,
    });

    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: "Could not create course" });
  }
});
module.exports = router;

