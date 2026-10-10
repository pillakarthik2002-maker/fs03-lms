# LMS User Roles

- **Student:** Browse courses, enroll, watch lessons, take quizzes, and earn certificates.
- **Instructor:** Create and manage courses, lessons, quizzes, and live classes; view earnings.
- **Admin:** Manage users and oversee courses and platform activity.

## Course

A course is created by one instructor and contains lessons.

- `title`: course name
- `description`: what students will learn
- `instructorId`: instructor who owns the course
- `status`: draft or published
- `createdAt`: when the course was created

## Lesson

A lesson belongs to one course and has an order within that course.

- `title`: lesson name
- `courseId`: course this lesson belongs to
- `order`: its position in the course
- `videoUrl`: where students can watch the lesson video

## Enrollment

An enrollment records that a student joined a course and tracks their progress.

- `studentId`: student who enrolled
- `courseId`: course they joined
- `enrolledAt`: when they enrolled
- `completedLessonIds`: lessons they have finished
- `status`: active or completed


## Relationships

- One instructor can create many courses.
- One course can contain many lessons.
- A student can enroll in many courses.
- A course can have many enrolled students.
- A student should have only one enrollment per course.