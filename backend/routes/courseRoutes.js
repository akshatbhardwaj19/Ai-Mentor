import express from "express";
import {
  getCourses,
  getCourseById,
  getCourseLearningData,
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
} from "../controllers/courseController.js";
import { protect } from "../middleware/authMiddleware.js";
import { admin } from "../middleware/adminMiddleware.js";

const router = express.Router();

/* =======================
   FIXED ORDER (IMPORTANT)
======================= */

// PUBLIC
router.route("/").get(getCourses);

// PROTECTED (KEEP BEFORE :id)
router.route("/my-courses").get(protect, getMyCourses);
router.route("/stats/cards").get(protect, getStatsCards);

// ADMIN TRASH ROUTES (must be before /:id)
router.route("/trash").get(protect, admin, getDeletedCourses);
router.route("/trash/:id/restore").post(protect, admin, restoreCourse);
router.route("/trash/:id/permanent").delete(protect, admin, permanentDeleteCourse);

// COURSE LEARNING
router.route("/:id/learning").get(getCourseLearningData);

// DYNAMIC (ALWAYS LAST)
router.route("/:id").get(getCourseById);

// ADMIN MUTATION ROUTES
router.route("/").post(protect, admin, addCourse);
router.route("/:id").put(protect, admin, updateCourse);
router.route("/:id").delete(protect, admin, deleteCourse);
router.route("/:courseId/modules").post(protect, admin, addModules);
router.route("/:courseId/modules/:moduleId").put(protect, admin, renameModule);
router.route("/:courseId/modules/:moduleId").delete(protect, admin, deleteModule);
router.route("/:courseId/modules/:moduleId/lessons").post(protect, admin, addLessons);
router.route("/:courseId/modules/:moduleId/lessons/:lessonId").put(protect, admin, renameLesson);
router.route("/:courseId/modules/:moduleId/lessons/:lessonId").delete(protect, admin, deleteLesson);
router.route("/:courseId/lessons/:lessonId/video").put(protect, admin, updateLessonVideo);
router.route("/:courseId/subtopics").post(protect, admin, addSubtopics);
router.route("/trash/:id/permanent").delete(protect, admin, permanentDeleteCourse);

export default router;
