const express = require("express");
const { randomUUID } = require("crypto");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Certificate = require("../models/Certificate");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

router.post("/:courseId", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const enrollment = await Enrollment.findOne({
      studentId: req.user._id,
      courseId: course._id,
    });

    if (!enrollment || enrollment.status !== "completed") {
      return res.status(400).json({
        message: "Complete all course lessons before getting your certificate",
      });
    }

    let certificate = await Certificate.findOne({
      studentId: req.user._id,
      courseId: course._id,
    });

    if (!certificate) {
      certificate = await Certificate.create({
        studentId: req.user._id,
        courseId: course._id,
        certificateCode: `FS03-${randomUUID()}`,
      });
    }

    res.json({
      certificateCode: certificate.certificateCode,
      issuedAt: certificate.issuedAt,
      studentName: req.user.name,
      courseTitle: course.title,
    });
  } catch (error) {
    res.status(500).json({ message: "Could not issue certificate" });
  }
});

module.exports = router;