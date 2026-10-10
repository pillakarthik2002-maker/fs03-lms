const express = require("express");
const Course = require("../models/course");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");
const router = express.Router();
const Lesson = require("../models/Lesson");

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
router.post(
  "/:courseId/lessons",
  requireAuth,
  requireRole("instructor", "admin"),
  async (req, res) => {
    try {
      const { title, order, videoUrl } = req.body;

      if (!title || !Number.isInteger(Number(order)) || Number(order) < 1) {
        return res.status(400).json({
          message: "A lesson title and positive order number are required",
        });
      }

      const course = await Course.findById(req.params.courseId);

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      if (
        req.user.role === "instructor" &&
        course.instructorId.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({ message: "You don’t own this course" });
      }

      const lesson = await Lesson.create({
        title: title.trim(),
        courseId: course._id,
        order: Number(order),
        videoUrl: videoUrl || "",
      });

      res.status(201).json(lesson);
    } catch (error) {
      res.status(500).json({ message: "Could not create lesson" });
    }
  }
);
module.exports = router;

