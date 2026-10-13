const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
    trim: true,
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: (options) => options.length >= 2,
      message: "Each question needs at least two options",
    },
  },
  correctAnswerIndex: {
    type: Number,
    required: true,
    min: 0,
  },
});

const quizSchema = new mongoose.Schema(
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
    questions: {
      type: [questionSchema],
      required: true,
      validate: {
        validator: (questions) => questions.length > 0,
        message: "A quiz needs at least one question",
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quiz", quizSchema);