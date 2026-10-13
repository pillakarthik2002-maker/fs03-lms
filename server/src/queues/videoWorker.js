const { Worker } = require("bullmq");
const { connection } = require("./videoQueue");
const { execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs/promises");
const path = require("path");
const Lesson = require("../models/Lesson");

const execFileAsync = promisify(execFile);

const worker = new Worker(
  "video-processing",
  async (job) => {
    const { lessonId, inputPath } = job.data;
    await Lesson.findByIdAndUpdate(lessonId, { videoStatus: "processing" });
    const outputDirectory = path.join(__dirname, "../../uploads/processed");

    await fs.mkdir(outputDirectory, { recursive: true });

    const outputPath = path.join(outputDirectory, `${lessonId}.mp4`);

    await execFileAsync(
      "C:\\Users\\KARTHIK\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.1-essentials_build\\bin\\ffmpeg.exe",
      [
        "-y",
        "-i",
        inputPath,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        outputPath,
      ],
      { maxBuffer: 10 * 1024 * 1024 }
    );

    const videoUrl = `/uploads/processed/${lessonId}.mp4`;
    await Lesson.findByIdAndUpdate(lessonId, {
      videoUrl,
      videoStatus: "ready",
    });
    return { videoUrl };
  },
  { connection }
);

worker.on("failed", async (job, error) => {
  console.error(`Video processing failed: ${error.message}`);

  if (job?.data?.lessonId) {
    try {
      await Lesson.findByIdAndUpdate(job.data.lessonId, {
        videoStatus: "failed",
      });
    } catch (updateError) {
      console.error(`Could not update video status: ${updateError.message}`);
    }
  }
});

worker.on("failed", (job, error) => {
  console.error(`Video processing failed: ${error.message}`);
});

module.exports = worker;