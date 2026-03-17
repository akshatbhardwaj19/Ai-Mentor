import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Course from "../models/Course.js"; // kept for future use

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================
   GET ALL COURSES (JSON)
========================= */
const getCourses = async (req, res) => {
  try {
    const coursesPath = path.join(
      __dirname,
      "../../frontend/public/data/courses.json"
    );

    const rawData = fs.readFileSync(coursesPath, "utf-8");
    const jsonData = JSON.parse(rawData);

    const courses = (jsonData.popularCourses || []).map((course) => ({
      id: course.id,
      title: course.title,
      category: course.category,
      level: course.level,
      lessons: course.lessons,
      lessonsCount: course.lessonsCount ||
        (course.lessons.includes(" of ")
          ? parseInt(course.lessons.split(" of ")[1])
          : parseInt(course.lessons.split(" ")[0])),
      price: course.price,
      rating: course.rating,
      students: course.students,
      image: course.image,
    }));

    res.json(courses);
  } catch (error) {
    console.error("GET COURSES JSON ERROR:", error);
    res.status(500).json({ message: "Failed to load courses" });
  }
};

/* =========================
   GET COURSE BY ID (JSON)
========================= */
const getCourseById = async (req, res) => {
  try {
    const coursesPath = path.join(
      __dirname,
      "../../frontend/public/data/courses.json"
    );

    const rawData = fs.readFileSync(coursesPath, "utf-8");
    const jsonData = JSON.parse(rawData);

    const course = jsonData.popularCourses.find(
      (c) => c.id === Number(req.params.id)
    );

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const mappedCourse = {
      ...course,
      lessonsCount: course.lessonsCount ||
        (course.lessons.includes(" of ")
          ? parseInt(course.lessons.split(" of ")[1])
          : parseInt(course.lessons.split(" ")[0])),
    };

    res.json(mappedCourse);
  } catch (error) {
    console.error("GET COURSE BY ID ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   GET MY COURSES (SAFE)
========================= */
const getMyCourses = async (req, res) => {
  try {
    if (!req.user) {
      return res.json([]);
    }

    const coursesPath = path.join(
      __dirname,
      "../../frontend/public/data/courses.json"
    );

    const rawData = fs.readFileSync(coursesPath, "utf-8");
    const jsonData = JSON.parse(rawData);

    const purchasedIds =
      req.user.purchasedCourses?.map((c) => Number(c.courseId)) || [];

    const myCourses = (jsonData.popularCourses || [])
      .filter((course) => purchasedIds.includes(course.id))
      .map((course) => ({
        id: course.id,
        title: course.title,
        category: course.category,
        level: course.level,
        lessons: course.lessons,
        lessonsCount:
          course.lessonsCount ||
          (course.lessons.includes(" of ")
            ? parseInt(course.lessons.split(" of ")[1])
            : parseInt(course.lessons.split(" ")[0])),
        image: course.image,
      }));

    res.json(myCourses);
  } catch (error) {
    console.error("MY COURSES ERROR:", error);
    res.json([]);
  }
};

/* =========================
   Learning Data
========================= */
const getCourseLearningData = async (req, res) => {
  // res.status(501).json({ message: "Not implemented yet" });
  try {
    const learningPath = path.join(
      __dirname,
      "../../frontend/public/data/learning.json"
    );

    if (!fs.existsSync(learningPath)) {
      return res.status(404).json({ message: "Learning data not found" });
    }

    const raw = fs.readFileSync(learningPath, "utf-8");
    const jsonData = JSON.parse(raw);

    const id = String(Number(req.params.id));
    const learning = jsonData[id];

    if (!learning) {
      return res.status(404).json({ message: "Learning data not found" });
    }

    // Ensure the course object includes an id
    const courseObj = { ...(learning.course || {}), id: Number(id) };

    res.json({ ...learning, course: courseObj });
  } catch (error) {
    console.error("GET COURSE LEARNING DATA ERROR:", error);
    res.status(500).json({ message: "Failed to load learning data" });
  }
};

/* =================================
  Get Course and Lesson Titles
===================================== */
const getCourseAndLessonTitles = (courseId, lessonId) => {
  try {
    const learningPath = path.join(
      __dirname,
      "../../frontend/public/data/learning.json"
    );

    const raw = fs.readFileSync(learningPath, "utf-8");
    const learningData = JSON.parse(raw);

    // 🔹 courseId is key in JSON
    const courseData = learningData[String(courseId)];

    if (!courseData) return null;

    const courseTitle = courseData.course?.title;

    if (!courseTitle) return null;

    // 🔹 Flatten all modules into lessons
    const lesson = (courseData.modules || [])
      .flatMap((module) => module.lessons || [])
      .find((l) => l.id === lessonId); // IMPORTANT: string compare

    if (!lesson) return null;

    return {
      courseTitle,
      lessonTitle: lesson.title,
    };

  } catch (error) {
    console.error("Error reading learning.json:", error);
    return null;
  }
};



const getStatsCards = async (req, res) => {
  res.json({
    totalCourses: 0,
    completedCourses: 0,
    hoursLearned: 0,
    certificates: 0,
  });
};

const addCourse = async (req, res) => {
  try {
    const coursesPath = path.join(__dirname, "../../frontend/public/data/courses.json");
    const rawData = fs.readFileSync(coursesPath, "utf-8");
    const jsonData = JSON.parse(rawData);

    // Get input assuming standard format
    const newCourse = req.body;
    
    // Assign a new ID if not provided
    if (!newCourse.id) {
       const existingIds = jsonData.popularCourses.map(c => c.id);
       newCourse.id = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    }

    // Append to popularCourses
    jsonData.popularCourses.push(newCourse);

    // Save back to JSON
    fs.writeFileSync(coursesPath, JSON.stringify(jsonData, null, 2), "utf-8");

    // Also initialize an empty learning entry for this course.
    const learningPath = path.join(__dirname, "../../frontend/public/data/learning.json");
    const learningData = fs.readFileSync(learningPath, "utf-8");
    const parsedLearningData = JSON.parse(learningData);
    
    parsedLearningData[String(newCourse.id)] = {
       id: String(newCourse.id),
       course: {
         title: newCourse.title,
         instructor: "Instructor Name"
       },
       modules: []
    };
    
    fs.writeFileSync(learningPath, JSON.stringify(parsedLearningData, null, 2), "utf-8");

    res.status(201).json({ message: "Course added successfully", course: newCourse });
  } catch (error) {
    console.error("ADD COURSE ERROR:", error);
    res.status(500).json({ message: "Failed to add course" });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const coursesPath = path.join(__dirname, "../../frontend/public/data/courses.json");
    const rawData = fs.readFileSync(coursesPath, "utf-8");
    const jsonData = JSON.parse(rawData);

    const courseId = Number(req.params.id);

    // Find the course to delete
    const courseToDelete = jsonData.popularCourses.find((c) => c.id === courseId);
    if (!courseToDelete) {
       return res.status(404).json({ message: "Course not found" });
    }

    // Remove from active courses
    jsonData.popularCourses = jsonData.popularCourses.filter((c) => c.id !== courseId);
    fs.writeFileSync(coursesPath, JSON.stringify(jsonData, null, 2), "utf-8");
    
    // Move to trash (deletedCourses.json)
    const trashPath = path.join(__dirname, "../../frontend/public/data/deletedCourses.json");
    let trashData = { deletedCourses: [] };
    if (fs.existsSync(trashPath)) {
      trashData = JSON.parse(fs.readFileSync(trashPath, "utf-8"));
    }
    // Tag with deletion time
    courseToDelete.deletedAt = new Date().toISOString();
    trashData.deletedCourses.push(courseToDelete);
    fs.writeFileSync(trashPath, JSON.stringify(trashData, null, 2), "utf-8");
    
    // Also soft-remove from learning.json (move to trash too)
    const learningPath = path.join(__dirname, "../../frontend/public/data/learning.json");
    if (fs.existsSync(learningPath)) {
      const parsedLearningData = JSON.parse(fs.readFileSync(learningPath, "utf-8"));
      const learningEntry = parsedLearningData[String(courseId)];
      if (learningEntry) {
        // Save learning data to trash
        const trashLearningPath = path.join(__dirname, "../../frontend/public/data/deletedLearning.json");
        let trashLearning = {};
        if (fs.existsSync(trashLearningPath)) {
          trashLearning = JSON.parse(fs.readFileSync(trashLearningPath, "utf-8"));
        }
        trashLearning[String(courseId)] = learningEntry;
        fs.writeFileSync(trashLearningPath, JSON.stringify(trashLearning, null, 2), "utf-8");
        delete parsedLearningData[String(courseId)];
        fs.writeFileSync(learningPath, JSON.stringify(parsedLearningData, null, 2), "utf-8");
      }
    }

    res.json({ message: "Course moved to trash successfully", course: courseToDelete });
  } catch (error) {
    console.error("DELETE COURSE ERROR:", error);
    res.status(500).json({ message: "Failed to delete course" });
  }
};

const getDeletedCourses = async (req, res) => {
  try {
    const trashPath = path.join(__dirname, "../../frontend/public/data/deletedCourses.json");
    if (!fs.existsSync(trashPath)) {
      return res.json([]);
    }
    const trashData = JSON.parse(fs.readFileSync(trashPath, "utf-8"));
    res.json(trashData.deletedCourses || []);
  } catch (error) {
    console.error("GET DELETED COURSES ERROR:", error);
    res.status(500).json({ message: "Failed to get deleted courses" });
  }
};

const restoreCourse = async (req, res) => {
  try {
    const courseId = Number(req.params.id);
    
    // Read trash
    const trashPath = path.join(__dirname, "../../frontend/public/data/deletedCourses.json");
    if (!fs.existsSync(trashPath)) {
      return res.status(404).json({ message: "No deleted courses found" });
    }
    const trashData = JSON.parse(fs.readFileSync(trashPath, "utf-8"));
    const courseToRestore = trashData.deletedCourses.find((c) => c.id === courseId);
    if (!courseToRestore) {
      return res.status(404).json({ message: "Course not found in trash" });
    }
    
    // Remove deletedAt tag
    delete courseToRestore.deletedAt;
    
    // Restore to active courses
    const coursesPath = path.join(__dirname, "../../frontend/public/data/courses.json");
    const jsonData = JSON.parse(fs.readFileSync(coursesPath, "utf-8"));
    jsonData.popularCourses.push(courseToRestore);
    fs.writeFileSync(coursesPath, JSON.stringify(jsonData, null, 2), "utf-8");
    
    // Remove from trash
    trashData.deletedCourses = trashData.deletedCourses.filter((c) => c.id !== courseId);
    fs.writeFileSync(trashPath, JSON.stringify(trashData, null, 2), "utf-8");
    
    // Restore learning data if it was saved
    const trashLearningPath = path.join(__dirname, "../../frontend/public/data/deletedLearning.json");
    if (fs.existsSync(trashLearningPath)) {
      const trashLearning = JSON.parse(fs.readFileSync(trashLearningPath, "utf-8"));
      if (trashLearning[String(courseId)]) {
        const learningPath = path.join(__dirname, "../../frontend/public/data/learning.json");
        const learningData = JSON.parse(fs.readFileSync(learningPath, "utf-8"));
        learningData[String(courseId)] = trashLearning[String(courseId)];
        fs.writeFileSync(learningPath, JSON.stringify(learningData, null, 2), "utf-8");
        delete trashLearning[String(courseId)];
        fs.writeFileSync(trashLearningPath, JSON.stringify(trashLearning, null, 2), "utf-8");
      }
    }
    
    res.json({ message: "Course restored successfully", course: courseToRestore });
  } catch (error) {
    console.error("RESTORE COURSE ERROR:", error);
    res.status(500).json({ message: "Failed to restore course" });
  }
};

const updateLessonVideo = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { youtubeUrl } = req.body;

    const learningPath = path.join(__dirname, "../../frontend/public/data/learning.json");
    const learningData = JSON.parse(fs.readFileSync(learningPath, "utf-8"));

    const course = learningData[String(courseId)];
    if (!course) return res.status(404).json({ message: "Course not found" });

    let lessonUpdated = false;
    course.modules.forEach(module => {
      module.lessons.forEach(lesson => {
        if (lesson.id === lessonId) {
          lesson.type = "video";
          // We can assign videoUrl instead if you like, assuming the frontend reads it.
          lesson.videoUrl = youtubeUrl; 
          lessonUpdated = true;
        }
      });
    });

    if (!lessonUpdated) return res.status(404).json({ message: "Lesson not found" });

    fs.writeFileSync(learningPath, JSON.stringify(learningData, null, 2), "utf-8");
    res.json({ message: "Video updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update video" });
  }
};

// ── Permanent delete from trash ──────────────────────────────────────────────
const permanentDeleteCourse = async (req, res) => {
  try {
    const courseId = Number(req.params.id);
    const trashPath = path.join(__dirname, "../../frontend/public/data/deletedCourses.json");
    if (!fs.existsSync(trashPath)) return res.status(404).json({ message: "Trash is empty" });
    const trashData = JSON.parse(fs.readFileSync(trashPath, "utf-8"));
    const before = trashData.deletedCourses.length;
    trashData.deletedCourses = trashData.deletedCourses.filter(c => c.id !== courseId);
    if (trashData.deletedCourses.length === before) return res.status(404).json({ message: "Course not found in trash" });
    fs.writeFileSync(trashPath, JSON.stringify(trashData, null, 2), "utf-8");
    // Also remove from deletedLearning
    const trashLearningPath = path.join(__dirname, "../../frontend/public/data/deletedLearning.json");
    if (fs.existsSync(trashLearningPath)) {
      const tl = JSON.parse(fs.readFileSync(trashLearningPath, "utf-8"));
      delete tl[String(courseId)];
      fs.writeFileSync(trashLearningPath, JSON.stringify(tl, null, 2), "utf-8");
    }
    res.json({ message: "Course permanently deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to permanently delete course" });
  }
};

// ── Update (edit) a course ─────────────────────────────────────────────────
const updateCourse = async (req, res) => {
  try {
    const courseId = Number(req.params.id);
    const coursesPath = path.join(__dirname, "../../frontend/public/data/courses.json");
    const jsonData = JSON.parse(fs.readFileSync(coursesPath, "utf-8"));
    const idx = jsonData.popularCourses.findIndex(c => c.id === courseId);
    if (idx === -1) return res.status(404).json({ message: "Course not found" });
    // Merge updated fields (don't overwrite id)
    jsonData.popularCourses[idx] = { ...jsonData.popularCourses[idx], ...req.body, id: courseId };
    fs.writeFileSync(coursesPath, JSON.stringify(jsonData, null, 2), "utf-8");
    // Sync title in learning.json
    const learningPath = path.join(__dirname, "../../frontend/public/data/learning.json");
    if (fs.existsSync(learningPath)) {
      const ld = JSON.parse(fs.readFileSync(learningPath, "utf-8"));
      if (ld[String(courseId)]) {
        ld[String(courseId)].course.title = req.body.title || ld[String(courseId)].course.title;
        fs.writeFileSync(learningPath, JSON.stringify(ld, null, 2), "utf-8");
      }
    }
    res.json({ message: "Course updated", course: jsonData.popularCourses[idx] });
  } catch (error) {
    res.status(500).json({ message: "Failed to update course" });
  }
};

// ── Add a module to a course in learning.json ────────────────────────────
const addModules = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: "Module title required" });
    const learningPath = path.join(__dirname, "../../frontend/public/data/learning.json");
    const ld = JSON.parse(fs.readFileSync(learningPath, "utf-8"));
    if (!ld[String(courseId)]) return res.status(404).json({ message: "Course not found in learning data" });
    const modules = ld[String(courseId)].modules || [];
    const newId = `m${Date.now()}`;
    modules.push({ id: newId, title, lessons: [] });
    ld[String(courseId)].modules = modules;
    fs.writeFileSync(learningPath, JSON.stringify(ld, null, 2), "utf-8");
    res.json({ message: "Module added", module: { id: newId, title, lessons: [] } });
  } catch (error) {
    res.status(500).json({ message: "Failed to add module" });
  }
};

// ── Add a lesson to a module ─────────────────────────────────────────────
const addLessons = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const { title, duration } = req.body;
    if (!title) return res.status(400).json({ message: "Lesson title required" });
    const learningPath = path.join(__dirname, "../../frontend/public/data/learning.json");
    const ld = JSON.parse(fs.readFileSync(learningPath, "utf-8"));
    const course = ld[String(courseId)];
    if (!course) return res.status(404).json({ message: "Course not found" });
    const mod = (course.modules || []).find(m => m.id === moduleId);
    if (!mod) return res.status(404).json({ message: "Module not found" });
    const newId = `l${Date.now()}`;
    const newLesson = { id: newId, title, duration: duration || "", completed: false, type: "video" };
    mod.lessons = mod.lessons || [];
    mod.lessons.push(newLesson);
    fs.writeFileSync(learningPath, JSON.stringify(ld, null, 2), "utf-8");
    res.json({ message: "Lesson added", lesson: newLesson });
  } catch (error) {
    res.status(500).json({ message: "Failed to add lesson" });
  }
};

// ── Rename a module ───────────────────────────────────────────────────────
const renameModule = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: "New title required" });
    const learningPath = path.join(__dirname, "../../frontend/public/data/learning.json");
    const ld = JSON.parse(fs.readFileSync(learningPath, "utf-8"));
    const course = ld[String(courseId)];
    if (!course) return res.status(404).json({ message: "Course not found" });
    const mod = (course.modules || []).find(m => m.id === moduleId);
    if (!mod) return res.status(404).json({ message: "Module not found" });
    mod.title = title;
    fs.writeFileSync(learningPath, JSON.stringify(ld, null, 2), "utf-8");
    res.json({ message: "Module renamed" });
  } catch (error) {
    res.status(500).json({ message: "Failed to rename module" });
  }
};

// ── Rename a lesson ───────────────────────────────────────────────────────
const renameLesson = async (req, res) => {
  try {
    const { courseId, moduleId, lessonId } = req.params;
    const { title, duration } = req.body;
    const learningPath = path.join(__dirname, "../../frontend/public/data/learning.json");
    const ld = JSON.parse(fs.readFileSync(learningPath, "utf-8"));
    const course = ld[String(courseId)];
    if (!course) return res.status(404).json({ message: "Course not found" });
    const mod = (course.modules || []).find(m => m.id === moduleId);
    if (!mod) return res.status(404).json({ message: "Module not found" });
    const lesson = (mod.lessons || []).find(l => l.id === lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    if (title) lesson.title = title;
    if (duration !== undefined) lesson.duration = duration;
    fs.writeFileSync(learningPath, JSON.stringify(ld, null, 2), "utf-8");
    res.json({ message: "Lesson updated" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update lesson" });
  }
};

// ── Delete a module ───────────────────────────────────────────────────────
const deleteModule = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const learningPath = path.join(__dirname, "../../frontend/public/data/learning.json");
    const ld = JSON.parse(fs.readFileSync(learningPath, "utf-8"));
    const course = ld[String(courseId)];
    if (!course) return res.status(404).json({ message: "Course not found" });
    const before = (course.modules || []).length;
    course.modules = (course.modules || []).filter(m => m.id !== moduleId);
    if (course.modules.length === before) return res.status(404).json({ message: "Module not found" });
    fs.writeFileSync(learningPath, JSON.stringify(ld, null, 2), "utf-8");
    res.json({ message: "Module deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete module" });
  }
};

// ── Delete a lesson ───────────────────────────────────────────────────────
const deleteLesson = async (req, res) => {
  try {
    const { courseId, moduleId, lessonId } = req.params;
    const learningPath = path.join(__dirname, "../../frontend/public/data/learning.json");
    const ld = JSON.parse(fs.readFileSync(learningPath, "utf-8"));
    const course = ld[String(courseId)];
    if (!course) return res.status(404).json({ message: "Course not found" });
    const mod = (course.modules || []).find(m => m.id === moduleId);
    if (!mod) return res.status(404).json({ message: "Module not found" });
    const before = (mod.lessons || []).length;
    mod.lessons = (mod.lessons || []).filter(l => l.id !== lessonId);
    if (mod.lessons.length === before) return res.status(404).json({ message: "Lesson not found" });
    fs.writeFileSync(learningPath, JSON.stringify(ld, null, 2), "utf-8");
    res.json({ message: "Lesson deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete lesson" });
  }
};

const addSubtopics = async (req, res) => {
  res.status(501).json({ message: "addSubtopics not fully implemented" });
};

/* =========================
   EXPORTS
========================= */
export {
  getCourses,
  getCourseById,
  getCourseLearningData,
  getCourseAndLessonTitles,
  getStatsCards,
  getMyCourses,
  addCourse,
  updateCourse,
  deleteCourse,
  permanentDeleteCourse,
  getDeletedCourses,
  restoreCourse,
  updateLessonVideo,
  addSubtopics,
  addLessons,
  addModules,
  renameModule,
  renameLesson,
  deleteModule,
  deleteLesson,
};
