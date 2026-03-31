import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import { generateCertificatePDF } from "../templates/certificateTemplate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getCertificates = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const purchasedCourses = user.purchasedCourses || [];
    let stats = {
      totalEnrolled: purchasedCourses.length,
      completed: 0,
      certificatesEarned: 0,
      inProgress: 0,
    };

    const coursesPath = path.join(__dirname, "../../frontend/public/data/courses.json");
    const rawData = fs.readFileSync(coursesPath, "utf-8");
    const jsonData = JSON.parse(rawData);
    const courseDetails = jsonData.popularCourses || [];
    
    let coursesData = [];
    
    for (const pCourse of purchasedCourses) {
       const dbCourse = courseDetails.find(c => Number(c.id) === Number(pCourse.courseId));
       
       let totalLessons = 0;
       if (dbCourse) {
         totalLessons = dbCourse.lessonsCount || 
           (dbCourse.lessons.includes(" of ") 
             ? parseInt(dbCourse.lessons.split(" of ")[1]) 
             : parseInt(dbCourse.lessons.split(" ")[0])) || 0;
       } else {
         totalLessons = 10; // default fallback
       }
       
       const completedLessonsList = pCourse.progress?.completedLessons || [];
       let completedLessons = completedLessonsList.length;
       
       // Fallback checking lessonData as users might have watchHistory.progressPercent = 100
       const lessonData = pCourse.progress?.lessonData || {};
       let actualCompleted = Object.values(lessonData).filter(l => l.watchHistory?.progressPercent >= 95).length;
       if (actualCompleted > completedLessons) {
          completedLessons = actualCompleted;
       }
       
       if (completedLessons > totalLessons && totalLessons > 0) completedLessons = totalLessons;
       
       // Mark as completed
       const isCompleted = totalLessons > 0 && completedLessons >= totalLessons;
       
       if (isCompleted) {
         stats.completed++;
         stats.certificatesEarned++;
       } else {
         stats.inProgress++;
       }
       
       coursesData.push({
         courseId: pCourse.courseId,
         courseTitle: pCourse.courseTitle || dbCourse?.title || "Unknown Course",
         courseImage: dbCourse?.image || null,
         category: dbCourse?.category || "General",
         isCompleted,
         completedLessons,
         totalLessons
       });
    }

    res.json({ stats, courses: coursesData });
  } catch (err) {
    console.error("Error fetching certificates:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const generateCertificate = async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ message: "courseId is required" });

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const purchasedCourses = user.purchasedCourses || [];
    const pCourse = purchasedCourses.find(c => Number(c.courseId) === Number(courseId));
    
    if (!pCourse) return res.status(404).json({ message: "Course not found for this user" });
    
    const coursesPath = path.join(__dirname, "../../frontend/public/data/courses.json");
    const rawData = fs.readFileSync(coursesPath, "utf-8");
    const jsonData = JSON.parse(rawData);
    const courseDetails = jsonData.popularCourses || [];
    const dbCourse = courseDetails.find(c => Number(c.id) === Number(courseId));
    const courseTitle = pCourse.courseTitle || dbCourse?.title || "Unknown Course";
    
    // Format date text
    const dateText = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const studentName = user.name || "Student Name";

    // Call function to generate PDF
    const pdfBytes = await generateCertificatePDF(studentName, courseTitle, dateText);
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Certificate_${courseId}.pdf`);
    res.send(Buffer.from(pdfBytes));

  } catch (err) {
    console.error("Error generating certificate pdf:", err);
    res.status(500).json({ message: "Server error" });
  }
};
