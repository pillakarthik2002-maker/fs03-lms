const { videoQueue } = require("../queues/videoQueue");
const express = require("express");
const multer = require("multer");
const path = require("path");
const Course = require("../models/Course");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");
const router = express.Router();
const Lesson = require("../models/Lesson");
const Enrollment = require("../models/Enrollment");
const videoUpload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "../../uploads"),
    filename: (req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `lesson-${Date.now()}${extension}`);
    },
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith("video/")) {
      return callback(new Error("Please select a video file."));
    }
    callback(null, true);
  },
});
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
router.post(
  "/:courseId/lessons/:lessonId/video",
  requireAuth,
  requireRole("instructor", "admin"),
  async (req, res, next) => {
    try {
      const course = await Course.findById(req.params.courseId);

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      if (
        req.user.role === "instructor" &&
        course.instructorId.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({ message: "You do not own this course" });
      }

      const lesson = await Lesson.findOne({
        _id: req.params.lessonId,
        courseId: course._id,
      });

      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      req.lesson = lesson;
      next();
    } catch (error) {
      res.status(500).json({ message: "Could not prepare video upload" });
    }
  },
  videoUpload.single("video"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Choose a video file" });
      }

      const lesson = await Lesson.findOne({
        _id: req.params.lessonId,
        courseId: req.params.courseId,
      });

      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      lesson.videoUrl = `/uploads/${req.file.filename}`;
      lesson.videoStatus = "queued";
      await lesson.save();
      await videoQueue.add("convert-to-mp4", {
        lessonId: lesson._id.toString(),
        inputPath: req.file.path,
      });
      console.log("Saved lesson video:", lesson._id.toString(), lesson.videoUrl);

      res.json({
        message: "Video uploaded; background conversion queued.",
        lesson,
      });
    } catch (error) {
      res.status(500).json({ message: "Could not save lesson video" });
    }
  }
);
router.patch(
  "/:courseId/publish",
  requireAuth,
  requireRole("instructor", "admin"),
  async (req, res) => {
    try {
      const course = await Course.findById(req.params.courseId);

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      if (
        req.user.role === "instructor" &&
        course.instructorId.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({ message: "You do not own this course" });
      }

      const hasLesson = await Lesson.exists({ courseId: course._id });

      if (!hasLesson) {
        return res.status(400).json({
          message: "Add at least one lesson before publishing",
        });
      }

      course.status = "published";
      await course.save();

      res.json(course);
    } catch (error) {
      res.status(500).json({ message: "Could not publish course" });
    }
  }
);
router.get(
  "/mine",
  requireAuth,
  requireRole("instructor", "admin"),
  async (req, res) => {
    try {
      const filter =
        req.user.role === "admin" ? {} : { instructorId: req.user._id };

      const courses = await Course.find(filter).sort({ createdAt: -1 });
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: "Could not load your courses" });
    }
  }
);
router.patch(
  "/:courseId/lessons/:lessonId/complete",
  requireAuth,
  requireRole("student"),
  async (req, res) => {
    try {
      const course = await Course.findOne({
        _id: req.params.courseId,
        status: "published",
      });

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const lesson = await Lesson.findOne({
        _id: req.params.lessonId,
        courseId: course._id,
      });

      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      const enrollment = await Enrollment.findOne({
        studentId: req.user._id,
        courseId: course._id,
      });

      if (!enrollment) {
        return res.status(403).json({ message: "Enroll in this course first" });
      }

      enrollment.completedLessonIds.addToSet(lesson._id);

      const totalLessons = await Lesson.countDocuments({
        courseId: course._id,
      });

      if (enrollment.completedLessonIds.length >= totalLessons) {
        enrollment.status = "completed";
      }

      await enrollment.save();

      res.json({
        message: "Lesson marked complete",
        completedCount: enrollment.completedLessonIds.length,
        totalLessons,
        status: enrollment.status,
      });
    } catch (error) {
      res.status(500).json({ message: "Could not update lesson progress" });
    }
  }
);
router.get("/:courseId", async (req, res) => {
  try {
    const course = await Course.findOne({
      _id: req.params.courseId,
      status: "published",
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const lessons = await Lesson.find({ courseId: course._id })
      .sort({ order: 1 })
      .select("title order videoUrl videoStatus");

    res.json({
      ...course.toObject(),
      lessons,
    });
  } catch (error) {
    res.status(500).json({ message: "Could not load course" });
  }
});
router.post(
  "/:courseId/enroll",
  requireAuth,
  requireRole("student"),
  async (req, res) => {
    try {
      const course = await Course.findOne({
        _id: req.params.courseId,
        status: "published",
      });

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const existingEnrollment = await Enrollment.findOne({
        studentId: req.user._id,
        courseId: course._id,
      });

      if (existingEnrollment) {
        return res.status(409).json({ message: "Already enrolled" });
      }

      const enrollment = await Enrollment.create({
        studentId: req.user._id,
        courseId: course._id,
      });

      res.status(201).json({
        message: "Enrolled successfully",
        enrollment,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ message: "Already enrolled" });
      }

      res.status(500).json({ message: "Could not enroll in course" });
    }
  }
);
router.get(
  "/:courseId/progress",
  requireAuth,
  requireRole("student"),
  async (req, res) => {
    try {
      const enrollment = await Enrollment.findOne({
        studentId: req.user._id,
        courseId: req.params.courseId,
      });

      if (!enrollment) {
        return res.status(403).json({
          message: "Enroll in this course to view progress",
        });
      }

      const totalLessons = await Lesson.countDocuments({
        courseId: req.params.courseId,
      });

      const completedLessonIds = enrollment.completedLessonIds.map((id) =>
        id.toString()
      );

      res.json({
        completedLessonIds,
        completedCount: completedLessonIds.length,
        totalLessons,
        percentage:
          totalLessons === 0
            ? 0
            : Math.round((completedLessonIds.length / totalLessons) * 100),
        status: enrollment.status,
      });
    } catch (error) {
      res.status(500).json({ message: "Could not load course progress" });
    }
  }
);
module.exports = router;

