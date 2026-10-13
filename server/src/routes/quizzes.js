const express = require("express");
const Quiz = require("../models/Quiz");
const Course = require("../models/Course");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");
const Enrollment = require("../models/Enrollment");
const QuizAttempt = require("../models/QuizAttempt");
const router = express.Router();
router.get("/:courseId", async (req, res) => {
    try {
        const course = await Course.findOne({
            _id: req.params.courseId,
            status: "published",
        });

        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        const quizzes = await Quiz.find({ courseId: course._id }).lean();

        const studentQuizzes = quizzes.map((quiz) => ({
            _id: quiz._id,
            title: quiz.title,
            questions: quiz.questions.map((question) => ({
                _id: question._id,
                questionText: question.questionText,
                options: question.options,
            })),
        }));

        res.json(studentQuizzes);
    } catch (error) {
        res.status(500).json({ message: "Could not load quizzes" });
    }
});
router.post(
    "/:courseId",
    requireAuth,
    requireRole("instructor", "admin"),
    async (req, res) => {
        try {
            const { title, questions } = req.body;

            if (!title?.trim() || !Array.isArray(questions) || questions.length === 0) {
                return res.status(400).json({
                    message: "Quiz title and at least one question are required",
                });
            }

            for (const question of questions) {
                if (
                    !question.questionText?.trim() ||
                    !Array.isArray(question.options) ||
                    question.options.length < 2 ||
                    !Number.isInteger(question.correctAnswerIndex) ||
                    question.correctAnswerIndex < 0 ||
                    question.correctAnswerIndex >= question.options.length
                ) {
                    return res.status(400).json({
                        message: "Check each question and its correct answer",
                    });
                }
            }

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

            const quiz = await Quiz.create({
                title: title.trim(),
                courseId: course._id,
                questions,
            });

            res.status(201).json(quiz);
        } catch (error) {
            res.status(500).json({ message: "Could not create quiz" });
        }
    }
);
router.post(
  "/:courseId/:quizId/submit",
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

      const enrollment = await Enrollment.findOne({
        studentId: req.user._id,
        courseId: course._id,
      });

      if (!enrollment) {
        return res.status(403).json({
          message: "Enroll in this course before taking its quiz",
        });
      }

      const quiz = await Quiz.findOne({
        _id: req.params.quizId,
        courseId: course._id,
      });

      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      const { answers } = req.body;

      if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
        return res.status(400).json({
          message: "Submit one answer for each question",
        });
      }

      for (let index = 0; index < answers.length; index += 1) {
        if (
          !Number.isInteger(answers[index]) ||
          answers[index] < 0 ||
          answers[index] >= quiz.questions[index].options.length
        ) {
          return res.status(400).json({
            message: "One or more answer choices are invalid",
          });
        }
      }

      let score = 0;

      quiz.questions.forEach((question, index) => {
        if (answers[index] === question.correctAnswerIndex) {
          score += 1;
        }
      });

      const totalQuestions = quiz.questions.length;
      const percentage = Math.round((score / totalQuestions) * 100);

      const attempt = await QuizAttempt.create({
        studentId: req.user._id,
        courseId: course._id,
        quizId: quiz._id,
        score,
        totalQuestions,
        percentage,
      });

      res.status(201).json({
        message: "Quiz submitted",
        score,
        totalQuestions,
        percentage,
        attemptId: attempt._id,
      });
    } catch (error) {
      res.status(500).json({ message: "Could not submit quiz" });
    }
  }
);

module.exports = router;