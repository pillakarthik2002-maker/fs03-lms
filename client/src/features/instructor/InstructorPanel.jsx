import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCourses } from "../courses/coursesSlice.js";
function InstructorPanel() {
  const dispatch = useDispatch();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [course, setCourse] = useState(null);
  const [message, setMessage] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonOrder, setLessonOrder] = useState("1");
  const [lessonMessage, setLessonMessage] = useState("");
  const [publishMessage, setPublishMessage] = useState("");
  const [myCourses, setMyCourses] = useState([]);
  const [myCoursesMessage, setMyCoursesMessage] = useState("");
  const [lesson, setLesson] = useState(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState("0");
  const [quizMessage, setQuizMessage] = useState("");
  const { user, token } = useSelector((state) => state.auth);
  const [earnings, setEarnings] = useState(null);
  const [earningsError, setEarningsError] = useState("");

  useEffect(() => {
    if (!token || !["instructor", "admin"].includes(user?.role)) return;

    fetch("/api/payments/earnings", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load earnings");
        setEarnings(data);
      })
      .catch((error) => setEarningsError(error.message));
  }, [token, user?.role]);

  useEffect(() => {
    if (!token || (user?.role !== "instructor" && user?.role !== "admin")) {
      return;
    }

    async function loadMyCourses() {
      try {
        const response = await fetch("/api/courses/mine", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load your courses");
        }

        setMyCourses(data);
      } catch (error) {
        setMyCoursesMessage(error.message);
      }
    }

    loadMyCourses();
  }, [token, user?.role]);

  if (user?.role !== "instructor" && user?.role !== "admin") {
    return null;
  }

  async function handleCreateCourse(event) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not create course");
      }

      setCourse(data);
      setTitle("");
      setDescription("");
      setMessage("Course created.");
      setLessonMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleAddLesson(event) {
    event.preventDefault();
    setLessonMessage("");

    try {
      const response = await fetch(`/api/courses/${course._id}/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: lessonTitle,
          order: Number(lessonOrder),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not add lesson");
      }
      setLesson(data);
      setLessonTitle("");
      setLessonMessage(`Lesson added: ${data.title}`);
    } catch (error) {
      setLessonMessage(error.message);
    }
  }
  async function handleVideoUpload(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    setLessonMessage("");

    try {
      const response = await fetch(
        `/api/courses/${lesson.courseId}/lessons/${lesson._id}/video`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not upload video");
      }

      setLesson(data.lesson);
      setLessonMessage(
        `${data.message}: ${data.lesson?.videoUrl || "no URL returned"}`
      );
    } catch (error) {
      setLessonMessage(error.message);
    }
  }
  async function handleCreateQuiz(event) {
    event.preventDefault();
    setQuizMessage("");

    try {
      const response = await fetch(`/api/quizzes/${course._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: quizTitle,
          questions: [
            {
              questionText,
              options,
              correctAnswerIndex: Number(correctAnswerIndex),
            },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not create quiz");
      }

      setQuizTitle("");
      setQuestionText("");
      setOptions(["", "", "", ""]);
      setCorrectAnswerIndex("0");
      setQuizMessage("Quiz created.");
    } catch (error) {
      setQuizMessage(error.message);
    }
  }
  async function handlePublishCourse() {
    setPublishMessage("");

    try {
      const response = await fetch(`/api/courses/${course._id}/publish`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not publish course");
      }

      setCourse(data);
      setPublishMessage("Course published.");
      dispatch(fetchCourses());
    } catch (error) {
      setPublishMessage(error.message);
    }
  }

  return (
    <section>
      <h2>Instructor: Create a course</h2>

     <form className="course-form" onSubmit={handleCreateCourse}>
        <p>
          <label>
            Course title{" "}
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
        </p>

        <p>
          <label>
            Description{" "}
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
        </p>

        <button type="submit">Create course</button>
      </form>

      {message && <p role="status">{message}</p>}
      <section className="earnings-card">
        <h2>Instructor earnings</h2>

        {earningsError && <p role="alert">{earningsError}</p>}

        {earnings && (
          <p>
            Paid enrollments: {earnings.paymentCount} · Total:{" "}
            {new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
            }).format(earnings.totalAmount / 100)}
          </p>
        )}
      </section>
      <h3>My courses</h3>

      {myCoursesMessage && <p role="alert">{myCoursesMessage}</p>}

      {myCourses.length === 0 ? (
        <p>No courses found.</p>
      ) : (
        <ul>
          {myCourses.map((savedCourse) => (
            <li key={savedCourse._id}>
              <strong>{savedCourse.title}</strong> — {savedCourse.status}{" "}
              <button
                type="button"
                onClick={() => {
                  setCourse(savedCourse);
                  setLessonMessage("");
                  setPublishMessage("");
                }}
              >
                Continue editing
              </button>
            </li>
          ))}
        </ul>
      )}

      {course && (
        <>
          <p>
            Current draft: <strong>{course.title}</strong>
          </p>

          <h3>Add a lesson</h3>
          <form className="lesson-form" onSubmit={handleAddLesson}>
            <p>
              <label>
                Lesson title{" "}
                <input
                  required
                  value={lessonTitle}
                  onChange={(event) => setLessonTitle(event.target.value)}
                />
              </label>
            </p>

            <p>
              <label>
                Lesson order{" "}
                <input
                  type="number"
                  min="1"
                  required
                  value={lessonOrder}
                  onChange={(event) => setLessonOrder(event.target.value)}
                />
              </label>
            </p>

            <button type="submit">Add lesson</button>
          </form>
          <h3>Create a quiz</h3>
          <form className="quiz-form" onSubmit={handleCreateQuiz}>
            <p>
              <label>
                Quiz title{" "}
                <input
                  required
                  value={quizTitle}
                  onChange={(event) => setQuizTitle(event.target.value)}
                />
              </label>
            </p>

            <p>
              <label>
                Question{" "}
                <input
                  required
                  value={questionText}
                  onChange={(event) => setQuestionText(event.target.value)}
                />
              </label>
            </p>

            {options.map((option, index) => (
              <p key={index}>
                <label>
                  Answer option {index + 1}{" "}
                  <input
                    required
                    value={option}
                    onChange={(event) =>
                      setOptions((currentOptions) =>
                        currentOptions.map((currentOption, optionIndex) =>
                          optionIndex === index ? event.target.value : currentOption
                        )
                      )
                    }
                  />
                </label>
              </p>
            ))}

            <p>
              <label>
                Correct answer{" "}
                <select
                  value={correctAnswerIndex}
                  onChange={(event) => setCorrectAnswerIndex(event.target.value)}
                >
                  <option value="0">Option 1</option>
                  <option value="1">Option 2</option>
                  <option value="2">Option 3</option>
                  <option value="3">Option 4</option>
                </select>
              </label>
            </p>

            <button type="submit">Create quiz</button>
          </form>

          {quizMessage && <p role="status">{quizMessage}</p>}
          {lesson && (
            <>
              <h3>Upload a lesson video</h3>
              <form className="upload-form" onSubmit={handleVideoUpload}>
                <p>
                  <label>
                    Video file{" "}
                    <input type="file" name="video" accept="video/*" required />
                  </label>
                </p>
                <button type="submit">Upload video</button>
              </form>
            </>
          )}

          {lessonMessage && <p role="status">{lessonMessage}</p>}
          {course.status !== "published" && (
            <button type="button" onClick={handlePublishCourse}>
              Publish course
            </button>
          )}

          {publishMessage && <p role="status">{publishMessage}</p>}
        </>
      )}
    </section>
  );
}

export default InstructorPanel;