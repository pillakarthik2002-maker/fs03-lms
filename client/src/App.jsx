import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import AuthPanel from "./features/auth/AuthPanel.jsx";
import { fetchCourses } from "./features/courses/coursesSlice.js";
import InstructorPanel from "./features/instructor/InstructorPanel.jsx";
import LiveClassRoom from "./features/liveClasses/LiveClassRoom.jsx";
function App() {
  const dispatch = useDispatch();
  const { items, status, error } = useSelector((state) => state.courses);
  const { user, token } = useSelector((state) => state.auth);

  const [courseDetails, setCourseDetails] = useState(null);
  const [detailStatus, setDetailStatus] = useState("idle");
  const [detailError, setDetailError] = useState("");
  const [enrollmentMessage, setEnrollmentMessage] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [quizzes, setQuizzes] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizMessage, setQuizMessage] = useState("");
  const [quizResult, setQuizResult] = useState(null);

  const [courseProgress, setCourseProgress] = useState(null);
  const [progressMessage, setProgressMessage] = useState("");
  const [certificate, setCertificate] = useState(null);
  const [certificateMessage, setCertificateMessage] = useState("");
  const [courseSearch, setCourseSearch] = useState("");

  const filteredCourses = items.filter((course) =>
    `${course.title} ${course.description}`
      .toLowerCase()
      .includes(courseSearch.trim().toLowerCase())
  );
  useEffect(() => {
    dispatch(fetchCourses());
  }, [dispatch]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get("session_id");

    if (url.searchParams.get("payment") !== "success" || !sessionId || !token) {
      return;
    }

    url.searchParams.delete("payment");
    url.searchParams.delete("session_id");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);

    async function confirmPayment() {
      setPaymentMessage("Checking payment...");

      try {
        const response = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not confirm payment");
        }

        setPaymentMessage(data.message);
      } catch (error) {
        setPaymentMessage(error.message);
      }
    }

    confirmPayment();
  }, [token]);

  async function showCourseDetails(courseId) {
    setCourseDetails(null);
    setDetailStatus("loading");
    setDetailError("");
    setEnrollmentMessage("");
    setCourseProgress(null);
    setProgressMessage("");

    try {
      const response = await fetch(`/api/courses/${courseId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load course details");
      }

      const quizResponse = await fetch(`/api/quizzes/${courseId}`);
      const quizData = await quizResponse.json();

      if (!quizResponse.ok) {
        throw new Error(quizData.message || "Could not load quizzes");
      }

      setQuizzes(quizData);
      setQuizAnswers({});
      setQuizMessage("");
      setQuizResult(null);

      if (user?.role === "student" && token) {
        const progressResponse = await fetch(
          `/api/courses/${courseId}/progress`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const progressData = await progressResponse.json();

        if (progressResponse.ok) {
          setCourseProgress(progressData);
        } else {
          setProgressMessage(progressData.message);
        }
      }

      setCourseDetails(data);
      setDetailStatus("succeeded");
    } catch (error) {
      setDetailError(error.message);
      setDetailStatus("failed");
    }
  }

  async function enrollInCourse(courseId) {
    setEnrollmentMessage("");

    try {
      const response = await fetch(`/api/payments/${courseId}/checkout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not start checkout");
      }

      window.location.href = data.checkoutUrl;
    } catch (error) {
      setEnrollmentMessage(error.message);
    }
  }

  async function submitQuiz(quiz) {
    setQuizMessage("");
    setQuizResult(null);

    const answers = quiz.questions.map(
      (_, index) => quizAnswers[quiz._id]?.[index]
    );

    if (answers.some((answer) => !Number.isInteger(answer))) {
      setQuizMessage("Choose an answer for every question first.");
      return;
    }

    try {
      const response = await fetch(
        `/api/quizzes/${courseDetails._id}/${quiz._id}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ answers }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not submit quiz");
      }

      setQuizResult({ quizId: quiz._id, ...data });
    } catch (error) {
      setQuizMessage(error.message);
    }
  }
  async function getCertificate() {
    setCertificateMessage("");

    try {
      const response = await fetch(
        `/api/certificates/${courseDetails._id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not get certificate");
      }

      setCertificate(data);
      setCertificateMessage("Certificate ready.");
    } catch (error) {
      setCertificateMessage(error.message);
    }
  }
  async function markLessonComplete(lessonId) {
    setProgressMessage("");

    try {
      const response = await fetch(
        `/api/courses/${courseDetails._id}/lessons/${lessonId}/complete`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save lesson progress");
      }

      setCourseProgress((currentProgress) => ({
        ...(currentProgress || {}),
        completedLessonIds: [
          ...new Set([
            ...(currentProgress?.completedLessonIds || []),
            lessonId,
          ]),
        ],
        completedCount: data.completedCount,
        totalLessons: data.totalLessons,
        percentage:
          data.totalLessons === 0
            ? 0
            : Math.round((data.completedCount / data.totalLessons) * 100),
        status: data.status,
      }));

      setProgressMessage(data.message);
    } catch (error) {
      setProgressMessage(error.message);
    }
  }

  return (
    <main>
      <h1>FS-03 Learning Management System</h1>
      <AuthPanel />
      {paymentMessage && <p role="status">{paymentMessage}</p>}
      <InstructorPanel />

      <h2>Published courses</h2>
      <label className="course-search">
        Search courses
        <input
          type="search"
          value={courseSearch}
          onChange={(event) => setCourseSearch(event.target.value)}
          placeholder="Search by title or description"
        />
      </label>

      {status === "loading" && <p>Loading courses...</p>}
      {status === "failed" && <p role="alert">Error: {error}</p>}
      {status === "succeeded" && items.length === 0 && (
        <p>No published courses yet.</p>
        
      )}
      {status === "succeeded" &&
        items.length > 0 &&
        filteredCourses.length === 0 && (
          <p>No published courses match “{courseSearch}”. Try another search.</p>
        )}

      <ul>
        {filteredCourses.map((course) => (
          <li key={course._id}>
            <h3>{course.title}</h3>
            <p>{course.description}</p>
            <button onClick={() => showCourseDetails(course._id)}>
              View details
            </button>
          </li>
        ))}
      </ul>

      {detailStatus === "loading" && <p>Loading course details...</p>}
      {detailStatus === "failed" && <p role="alert">{detailError}</p>}

      {detailStatus === "succeeded" && courseDetails && (
        <section>
          <h2>{courseDetails.title}</h2>
          <LiveClassRoom
            courseId={courseDetails._id}
            token={token}
            userRole={user?.role}
          />
          <h3>Lessons</h3>

          {courseDetails.lessons.length === 0 ? (
            <p>No lessons yet.</p>
          ) : (
            <ol>
              {courseDetails.lessons.map((lesson) => {
                const isComplete =
                  courseProgress?.completedLessonIds?.includes(lesson._id);

                return (
                  <li key={lesson._id}>
                    <strong>{lesson.title}</strong>
                    <p>
                      Video status:{" "}
                      {lesson.videoUrl && lesson.videoStatus === "not_uploaded"
                        ? "ready"
                        : lesson.videoStatus || (lesson.videoUrl ? "ready" : "not uploaded")}
                    </p>
                    {lesson.videoUrl && (
                      <video
                        controls
                        width="480"
                        src={`http://localhost:5000${lesson.videoUrl}`}
                      >
                        Your browser does not support video playback.
                      </video>
                    )}

                    {user?.role === "student" && courseProgress && (
                      <button
                        type="button"
                        disabled={isComplete}
                        onClick={() => markLessonComplete(lesson._id)}
                      >
                        {isComplete ? "Completed" : "Mark lesson complete"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {courseProgress && (
            <p>
              Course progress: {courseProgress.completedCount} of{" "}
              {courseProgress.totalLessons} lessons (
              {courseProgress.percentage}%)
            </p>
          )}
          <progress
            value={courseProgress.percentage}
            max="100"
            aria-label="Course completion"
          />

          {progressMessage && <p role="status">{progressMessage}</p>}
          {user?.role === "student" && courseProgress?.status === "completed" && (
            <button type="button" onClick={getCertificate}>
              Get certificate
            </button>
          )}

          {certificateMessage && <p role="status">{certificateMessage}</p>}

          {certificate && (
            <section>
              <h3>Certificate of Completion</h3>
              <p>This certifies that {certificate.studentName} completed:</p>
              <h2>{certificate.courseTitle}</h2>
              <p>Certificate ID: {certificate.certificateCode}</p>
              <p>Issued: {new Date(certificate.issuedAt).toLocaleDateString()}</p>
              <button type="button" onClick={() => window.print()}>
                Print / Save as PDF
              </button>
            </section>
          )}
          <h3>Quizzes</h3>

          {quizzes.length === 0 ? (
            <p>No quizzes for this course yet.</p>
          ) : (
            quizzes.map((quiz) => (
              <section key={quiz._id}>
                <h4>{quiz.title}</h4>

                {quiz.questions.map((question, questionIndex) => (
                  <fieldset className="quiz-question" key={question._id}>
                    <legend>{question.questionText}</legend>

                    {question.options.map((option, optionIndex) => (
                      <label className="quiz-option" key={optionIndex}>
                        <input
                          type="radio"
                          name={`${quiz._id}-${questionIndex}`}
                          checked={
                            quizAnswers[quiz._id]?.[questionIndex] ===
                            optionIndex
                          }
                          onChange={() =>
                            setQuizAnswers((currentAnswers) => ({
                              ...currentAnswers,
                              [quiz._id]: {
                                ...currentAnswers[quiz._id],
                                [questionIndex]: optionIndex,
                              },
                            }))
                          }
                        />
                        {option}
                      </label>
                    ))}
                  </fieldset>
                ))}

                {user?.role === "student" && token && courseProgress ? (
                  <button type="button" onClick={() => submitQuiz(quiz)}>
                    Submit quiz
                  </button>
                ) : (
                  <p>Enroll in this course with a student account to take the quiz.</p>
                )}

                {quizResult?.quizId === quiz._id && (
                  <p role="status">
                    Score: {quizResult.score} / {quizResult.totalQuestions} (
                    {quizResult.percentage}%)
                  </p>
                )}
              </section>
            ))
          )}

          {quizMessage && <p role="alert">{quizMessage}</p>}

          {user?.role === "student" && token ? (
            courseProgress ? (
              <p>You are enrolled in this course.</p>
            ) : (
              <button onClick={() => enrollInCourse(courseDetails._id)}>
                Enroll in this course
              </button>
            )
          ) : (
            <p>Sign in with a student account to enroll.</p>
          )}

          {enrollmentMessage && <p role="status">{enrollmentMessage}</p>}
        </section>
      )}
    </main>
  );
}

export default App;