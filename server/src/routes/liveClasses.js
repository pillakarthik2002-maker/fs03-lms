const express = require("express");
const { AccessToken } = require("livekit-server-sdk");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.post("/:courseId/token", requireAuth, async (req, res) => {
  try {
    if (
      !process.env.LIVEKIT_API_KEY ||
      !process.env.LIVEKIT_API_SECRET ||
      !process.env.LIVEKIT_URL
    ) {
      return res.status(500).json({
        message: "LiveKit settings are missing from the server environment",
      });
    }

    const course = await Course.findOne({
      _id: req.params.courseId,
      status: "published",
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    let canJoin = false;

    if (req.user.role === "admin") {
      canJoin = true;
    } else if (req.user.role === "instructor") {
      canJoin =
        course.instructorId.toString() === req.user._id.toString();
    } else if (req.user.role === "student") {
      const enrollment = await Enrollment.exists({
        studentId: req.user._id,
        courseId: course._id,
      });
      canJoin = Boolean(enrollment);
    }

    if (!canJoin) {
      return res.status(403).json({
        message: "Enroll in this course before joining its live class",
      });
    }

    const roomName = `course-${course._id}`;
    const identity = req.user._id.toString();

    const accessToken = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity,
        name: req.user.name || identity,
        ttl: "1h",
      }
    );

    accessToken.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: req.user.role !== "student",
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await accessToken.toJwt();

    res.json({
      token,
      serverUrl: process.env.LIVEKIT_URL,
      roomName,
    });
  } catch (error) {
    res.status(500).json({ message: "Could not create live class token" });
  }
});

module.exports = router;