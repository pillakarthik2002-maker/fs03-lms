const express = require("express");
const Stripe = require("stripe");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Payment = require("../models/Payment");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();
router.get(
  "/earnings",
  requireAuth,
  requireRole("instructor", "admin"),
  async (req, res) => {
    try {
      const match =
        req.user.role === "admin"
          ? { status: "paid" }
          : { instructorId: req.user._id, status: "paid" };

      const [summary] = await Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            paymentCount: { $sum: 1 },
          },
        },
      ]);

      res.json({
        totalAmount: summary?.totalAmount || 0,
        paymentCount: summary?.paymentCount || 0,
        currency: "inr",
      });
    } catch (error) {
      res.status(500).json({ message: "Could not load earnings" });
    }
  }
);

router.post(
  "/:courseId/checkout",
  requireAuth,
  requireRole("student"),
  async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ message: "Stripe key is missing" });
      }

      const course = await Course.findOne({
        _id: req.params.courseId,
        status: "published",
      });

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "inr",
              product_data: { name: course.title },
              unit_amount: 49900,
            },
            quantity: 1,
          },
        ],
        metadata: {
          studentId: req.user._id.toString(),
          courseId: course._id.toString(),
          instructorId: course.instructorId.toString(),
        },
        success_url:
          "http://localhost:5173/?payment=success&session_id={CHECKOUT_SESSION_ID}",
        cancel_url: "http://localhost:5173/?payment=cancelled",
      });

      await Payment.create({
        studentId: req.user._id,
        instructorId: course.instructorId,
        courseId: course._id,
        stripeSessionId: session.id,
        amount: 49900,
        currency: "inr",
        status: "pending",
      });

      res.json({ checkoutUrl: session.url });
    } catch (error) {
      res.status(500).json({ message: "Could not start checkout" });
    }
  }
);

router.post("/confirm", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: "Checkout session is required" });
    }

    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (
      session.payment_status !== "paid" ||
      session.metadata.studentId !== req.user._id.toString()
    ) {
      return res.status(400).json({ message: "Payment is not complete" });
    }

    const payment = await Payment.findOne({
      stripeSessionId: session.id,
      studentId: req.user._id,
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment record not found" });
    }

    payment.status = "paid";
    await payment.save();

    await Enrollment.findOneAndUpdate(
      { studentId: req.user._id, courseId: payment.courseId },
      {
        $setOnInsert: {
          studentId: req.user._id,
          courseId: payment.courseId,
        },
      },
      { upsert: true, new: true }
    );

    res.json({ message: "Payment successful. You are enrolled." });
  } catch (error) {
    res.status(500).json({ message: "Could not confirm payment" });
  }
});

module.exports = router;