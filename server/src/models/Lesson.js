const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    order: {
      type: Number,
      required: true,
      min: 1,
    },
    videoUrl: {
      type: String,
      default: "",
    },
        videoStatus: {
      type: String,
      enum: ["not_uploaded", "queued", "processing", "ready", "failed"],
      default: "not_uploaded",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lesson", lessonSchema);