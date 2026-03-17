import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import { useSidebar } from "../context/SidebarContext";
import toast from "react-hot-toast";
import Header from "../components/Header";

/* ─── Confirmation Modal ──────────────────────────────────────────────────── */
const ConfirmModal = ({ title, message, confirmLabel = "Delete", onConfirm, onCancel, danger = true }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
    <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
      <h3 className="text-lg font-bold text-main">{title}</h3>
      <p className="text-muted text-sm">{message}</p>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-border text-main hover:bg-canvas-alt transition">Cancel</button>
        <button onClick={onConfirm} className={`px-4 py-2 text-sm rounded-lg text-white font-medium transition ${danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}>{confirmLabel}</button>
      </div>
    </div>
  </div>
);

/* ─── Course Edit Modal ───────────────────────────────────────────────────── */
const EditCourseModal = ({ course, onClose, onSave, token }) => {
  const [form, setForm] = useState({ ...course });
  const [saving, setSaving] = useState(false);
  const authHeader = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: "PUT", headers: authHeader, body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      toast.success("Course updated!");
      onSave(form);
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const f = (field) => ({ value: form[field] || "", onChange: (e) => setForm(p => ({ ...p, [field]: e.target.value })) });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-main">✏️ Edit Course</h2>
          <button onClick={onClose} className="text-muted hover:text-main text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs text-muted mb-1 block">Title</label>
            <input {...f("title")} className="w-full p-2.5 border border-border rounded-lg bg-input text-main text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Category</label>
            <input {...f("category")} className="w-full p-2.5 border border-border rounded-lg bg-input text-main text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Level</label>
            <select {...f("level")} className="w-full p-2.5 border border-border rounded-lg bg-input text-main text-sm">
              <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Price</label>
            <input {...f("price")} className="w-full p-2.5 border border-border rounded-lg bg-input text-main text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Rating</label>
            <input type="number" step="0.1" min="0" max="5" {...f("rating")} className="w-full p-2.5 border border-border rounded-lg bg-input text-main text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Students</label>
            <input {...f("students")} className="w-full p-2.5 border border-border rounded-lg bg-input text-main text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Lessons</label>
            <input {...f("lessons")} className="w-full p-2.5 border border-border rounded-lg bg-input text-main text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-muted mb-1 block">Image URL</label>
            <input {...f("image")} className="w-full p-2.5 border border-border rounded-lg bg-input text-main text-sm" />
            {form.image && <img src={form.image} alt="" className="mt-2 h-24 w-full object-cover rounded-lg opacity-80" />}
          </div>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border text-main hover:bg-canvas-alt transition">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition disabled:opacity-50">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Lesson Management Modal ─────────────────────────────────────────────── */
const LessonModal = ({ courseData, courseId, onClose, token }) => {
  // Local mutable state — never closes the modal, no page refresh
  const [modules, setModules] = useState(courseData?.modules || []);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [addingLesson, setAddingLesson] = useState(null); // moduleId
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonDuration, setNewLessonDuration] = useState("");


  const authHeader = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const allLessons = modules.flatMap(m => (m.lessons || []).map(l => ({ ...l, moduleId: m.id, moduleName: m.title })));

  // ── Helpers ──────────────────────────────────────────────────────────────
  const applyOrRevert = async (applyFn, revertFn, apiFn) => {
    applyFn(); // optimistic update
    try { await apiFn(); }
    catch (err) { toast.error(err.message || "Failed"); revertFn(); }
  };

  // ── Rename Module ─────────────────────────────────────────────────────────
  const handleRenameModule = (moduleId, currentTitle) => {
    const newTitle = window.prompt("Rename module:", currentTitle);
    if (!newTitle || newTitle === currentTitle) return;
    const prev = modules.map(m => ({ ...m }));
    applyOrRevert(
      () => setModules(ms => ms.map(m => m.id === moduleId ? { ...m, title: newTitle } : m)),
      () => setModules(prev),
      async () => {
        const res = await fetch(`/api/courses/${courseId}/modules/${moduleId}`, { method: "PUT", headers: authHeader, body: JSON.stringify({ title: newTitle }) });
        if (!res.ok) throw new Error("Rename failed");
        toast.success("Module renamed!");
      }
    );
  };

  // ── Delete Module ─────────────────────────────────────────────────────────
  const handleDeleteModule = (moduleId) => {
    if (!window.confirm("Delete this module and all its lessons?")) return;
    const prev = [...modules];
    applyOrRevert(
      () => setModules(ms => ms.filter(m => m.id !== moduleId)),
      () => setModules(prev),
      async () => {
        const res = await fetch(`/api/courses/${courseId}/modules/${moduleId}`, { method: "DELETE", headers: authHeader });
        if (!res.ok) throw new Error("Delete failed");
        toast.success("Module deleted!");
      }
    );
  };

  // ── Rename Lesson ────────────────────────────────────────────────────────
  const handleRenameLesson = (moduleId, lessonId, currentTitle) => {
    const newTitle = window.prompt("Rename lesson:", currentTitle);
    if (!newTitle || newTitle === currentTitle) return;
    const prev = modules.map(m => ({ ...m, lessons: [...(m.lessons || [])] }));
    applyOrRevert(
      () => setModules(ms => ms.map(m => m.id === moduleId
        ? { ...m, lessons: m.lessons.map(l => l.id === lessonId ? { ...l, title: newTitle } : l) }
        : m)),
      () => setModules(prev),
      async () => {
        const res = await fetch(`/api/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, { method: "PUT", headers: authHeader, body: JSON.stringify({ title: newTitle }) });
        if (!res.ok) throw new Error("Rename failed");
        toast.success("Lesson renamed!");
      }
    );
  };

  // ── Delete Lesson ────────────────────────────────────────────────────────
  const handleDeleteLesson = (moduleId, lessonId) => {
    if (!window.confirm("Delete this lesson?")) return;
    const prev = modules.map(m => ({ ...m, lessons: [...(m.lessons || [])] }));
    applyOrRevert(
      () => setModules(ms => ms.map(m => m.id === moduleId
        ? { ...m, lessons: (m.lessons || []).filter(l => l.id !== lessonId) }
        : m)),
      () => setModules(prev),
      async () => {
        const res = await fetch(`/api/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, { method: "DELETE", headers: authHeader });
        if (!res.ok) throw new Error("Delete failed");
        toast.success("Lesson deleted!");
      }
    );
  };

  // ── Add Module ───────────────────────────────────────────────────────────
  const handleAddModule = async () => {
    if (!newModuleTitle.trim()) { toast.error("Enter a module title"); return; }
    const tempId = `m${Date.now()}`;
    const newMod = { id: tempId, title: newModuleTitle.trim(), lessons: [] };
    setModules(ms => [...ms, newMod]);
    setNewModuleTitle("");
    try {
      const res = await fetch(`/api/courses/${courseId}/modules`, { method: "POST", headers: authHeader, body: JSON.stringify({ title: newMod.title }) });
      if (!res.ok) throw new Error("Failed to add");
      const { module: saved } = await res.json();
      // Replace temp ID with real one from server
      setModules(ms => ms.map(m => m.id === tempId ? { ...m, id: saved.id } : m));
      toast.success("Module added!");
    } catch (err) {
      toast.error(err.message);
      setModules(ms => ms.filter(m => m.id !== tempId));
    }
  };

  // ── Add Lesson ───────────────────────────────────────────────────────────
  const handleAddLesson = async (moduleId) => {
    if (!newLessonTitle.trim()) { toast.error("Enter a lesson title"); return; }
    const tempId = `l${Date.now()}`;
    const newLesson = { id: tempId, title: newLessonTitle.trim(), duration: newLessonDuration, completed: false, type: "video" };
    setModules(ms => ms.map(m => m.id === moduleId ? { ...m, lessons: [...(m.lessons || []), newLesson] } : m));
    setNewLessonTitle(""); setNewLessonDuration(""); setAddingLesson(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/modules/${moduleId}/lessons`, { method: "POST", headers: authHeader, body: JSON.stringify({ title: newLesson.title, duration: newLesson.duration }) });
      if (!res.ok) throw new Error("Failed to add");
      const { lesson: saved } = await res.json();
      setModules(ms => ms.map(m => m.id === moduleId
        ? { ...m, lessons: m.lessons.map(l => l.id === tempId ? { ...l, id: saved.id } : l) }
        : m));
      toast.success("Lesson added!");
    } catch (err) {
      toast.error(err.message);
      setModules(ms => ms.map(m => m.id === moduleId ? { ...m, lessons: (m.lessons || []).filter(l => l.id !== tempId) } : m));
    }
  };



  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-main">{courseData?.course?.title}</h2>
            <p className="text-muted text-sm">{modules.length} Modules · {allLessons.length} Lessons</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-main text-2xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">

          {/* ── Modules & Lessons ─────────────────────────────────────── */}
          <div>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Course Structure</h3>

            {modules.length === 0 && <p className="text-muted text-sm mb-3">No modules yet. Add one below.</p>}

            {modules.map((m) => (
              <div key={m.id} className="mb-4 border border-border rounded-xl overflow-hidden">
                {/* Module Header */}
                <div className="flex items-center justify-between bg-canvas-alt px-4 py-2.5">
                  <p className="font-semibold text-main text-sm truncate">📦 {m.title}</p>
                  <div className="flex gap-2 flex-shrink-0 ml-2">
                    <button onClick={() => handleRenameModule(m.id, m.title)} className="text-xs text-blue-500 hover:underline">Rename</button>
                    <button onClick={() => { setAddingLesson(m.id); setNewLessonTitle(""); setNewLessonDuration(""); }} className="text-xs text-green-600 hover:underline">+ Lesson</button>
                    <button onClick={() => handleDeleteModule(m.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </div>
                </div>

                {/* Lessons */}
                <div className="divide-y divide-border">
                  {(m.lessons || []).map((l, li) => (
                    <div key={l.id} className="flex items-center justify-between px-4 py-2 bg-canvas hover:bg-canvas-alt transition group">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-muted flex-shrink-0">{li + 1}.</span>
                        <span className="text-sm text-main truncate">{l.title}</span>
                        {l.duration && <span className="text-xs text-muted flex-shrink-0">({l.duration})</span>}
                        {l.videoUrl && <a href={l.videoUrl} target="_blank" rel="noreferrer" className="text-blue-500 text-xs flex-shrink-0 hover:underline">▶</a>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => handleRenameLesson(m.id, l.id, l.title)} className="text-xs text-blue-500 hover:underline">Rename</button>
                        <button onClick={() => handleDeleteLesson(m.id, l.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                      </div>
                    </div>
                  ))}
                  {(!m.lessons || m.lessons.length === 0) && (
                    <p className="px-4 py-2 text-xs text-muted">No lessons yet.</p>
                  )}
                </div>

                {/* Inline add lesson form */}
                {addingLesson === m.id && (
                  <div className="p-4 bg-canvas-alt border-t border-border flex flex-col gap-2">
                    <input value={newLessonTitle} onChange={e => setNewLessonTitle(e.target.value)} placeholder="Lesson title*" autoFocus className="p-2 border border-border rounded-lg bg-input text-main text-sm w-full" />
                    <input value={newLessonDuration} onChange={e => setNewLessonDuration(e.target.value)} placeholder="Duration (e.g. 12:30)" className="p-2 border border-border rounded-lg bg-input text-main text-sm w-full" />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setAddingLesson(null)} className="px-3 py-1.5 text-xs border border-border rounded-lg text-main hover:bg-canvas transition">Cancel</button>
                      <button onClick={() => handleAddLesson(m.id)} className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition">Add Lesson</button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add Module */}
            <div className="flex gap-2 mt-2">
              <input value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddModule()} placeholder="New module title…" className="flex-1 p-2.5 border border-border rounded-lg bg-input text-main text-sm" />
              <button onClick={handleAddModule} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition">+ Module</button>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
};

/* ─── Main Admin Page ─────────────────────────────────────────────────────── */
const AdminPage = () => {
  const { sidebarCollapsed } = useSidebar();
  const [courses, setCourses] = useState([]);
  const [deletedCourses, setDeletedCourses] = useState([]);
  const [activeSection, setActiveSection] = useState("courses");
  const [lessonCourse, setLessonCourse] = useState(null);   // for LessonModal
  const [editCourse, setEditCourse] = useState(null);       // for EditCourseModal
  const [confirmModal, setConfirmModal] = useState(null);   // { type, course }
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [newCourse, setNewCourse] = useState({
    title: "", category: "", level: "", rating: 4.5,
    students: "0 students", lessons: "0 lessons", price: "₹0", image: "",
    categoryColor: "bg-blue-100 text-blue-600",
  });

  const token = localStorage.getItem("token");
  const authHeader = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchCourses = async () => {
    try { const r = await fetch("/api/courses"); setCourses(await r.json()); } catch { /* */ }
  };
  const fetchDeletedCourses = async () => {
    try { const r = await fetch("/api/courses/trash", { headers: authHeader }); const d = await r.json(); setDeletedCourses(Array.isArray(d) ? d : []); } catch { /* */ }
  };

  useEffect(() => { fetchCourses(); fetchDeletedCourses(); }, []);

  // ─── Image Upload ───────────────────────────────────────────────────────
  const uploadCourseImage = async (file) => {
    if (!file) return;
    setImageUploading(true);
    setImagePreview(URL.createObjectURL(file));
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload/course-image", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      if (!res.ok) throw new Error((await res.json()).message);
      const { url } = await res.json();
      setNewCourse(p => ({ ...p, image: url }));
      toast.success("Image uploaded!");
    } catch (err) { toast.error(`Upload failed: ${err.message}`); setImagePreview(null); setNewCourse(p => ({ ...p, image: "" })); }
    finally { setImageUploading(false); }
  };

  // ─── Add Course ─────────────────────────────────────────────────────────
  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.image) { toast.error("Please upload a cover image first"); return; }
    const payload = { ...newCourse, rating: parseFloat(newCourse.rating) };
    const prev = [...courses];
    setCourses(prev => [...prev, payload]);
    setNewCourse({ title: "", category: "", level: "", rating: 4.5, students: "0 students", lessons: "0 lessons", price: "₹0", image: "", categoryColor: "bg-blue-100 text-blue-600" });
    setImagePreview(null);
    try {
      const res = await fetch("/api/courses", { method: "POST", headers: authHeader, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).message);
      toast.success("Course added!"); fetchCourses();
    } catch (err) { toast.error(`Add failed: ${err.message}`); setCourses(prev); }
  };

  // ─── Delete (to Trash) ──────────────────────────────────────────────────
  const handleDeleteCourse = async (courseId) => {
    const prev = [...courses]; const trashPrev = [...deletedCourses];
    const removed = courses.find(c => c.id === courseId);
    setCourses(courses.filter(c => c.id !== courseId));
    if (removed) setDeletedCourses(p => [...p, { ...removed, deletedAt: new Date().toISOString() }]);
    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: "DELETE", headers: authHeader });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Moved to Trash!");
    } catch (err) { toast.error(err.message); setCourses(prev); setDeletedCourses(trashPrev); }
  };

  // ─── Restore ────────────────────────────────────────────────────────────
  const handleRestoreCourse = async (courseId) => {
    const prev = [...deletedCourses]; const coursePrev = [...courses];
    const toRestore = deletedCourses.find(c => c.id === courseId);
    setDeletedCourses(deletedCourses.filter(c => c.id !== courseId));
    if (toRestore) { const { deletedAt, ...clean } = toRestore; setCourses(p => [...p, clean]); }
    try {
      const res = await fetch(`/api/courses/trash/${courseId}/restore`, { method: "POST", headers: authHeader });
      if (!res.ok) throw new Error("Restore failed");
      toast.success("Course restored!");
    } catch (err) { toast.error(err.message); setDeletedCourses(prev); setCourses(coursePrev); }
  };

  // ─── Permanent Delete ────────────────────────────────────────────────────
  const handlePermanentDelete = async (courseId) => {
    const prev = [...deletedCourses];
    setDeletedCourses(p => p.filter(c => c.id !== courseId));
    setConfirmModal(null);
    try {
      const res = await fetch(`/api/courses/trash/${courseId}/permanent`, { method: "DELETE", headers: authHeader });
      if (!res.ok) throw new Error("Permanent delete failed");
      toast.success("Course permanently deleted");
    } catch (err) { toast.error(err.message); setDeletedCourses(prev); }
  };

  // ─── Manage Lessons ──────────────────────────────────────────────────────
  const handleManageLessons = async (courseId) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/learning`);
      if (res.ok) setLessonCourse({ ...(await res.json()), courseId });
      else toast.error("Failed to load course details");
    } catch { toast.error("Failed to load"); }
  };

  // ─── Update course in list after edit ────────────────────────────────────
  const handleEditSave = (updated) => {
    setCourses(p => p.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    setEditCourse(null);
  };

  return (
    <div className="min-h-screen bg-canvas-alt flex flex-col">
      <Header />
      <Sidebar activePage="admin" />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarCollapsed ? "lg:ml-20" : "lg:ml-80"}`}>
        <main className="flex-1 mt-16 overflow-x-hidden overflow-y-auto p-6 bg-canvas-alt">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* Page Title + Tabs */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-main">🛡️ Admin Panel</h1>
              <div className="flex gap-2">
                <button onClick={() => setActiveSection("courses")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeSection === "courses" ? "bg-blue-600 text-white" : "bg-card border border-border text-main hover:bg-canvas-alt"}`}>
                  Courses ({courses.length})
                </button>
                <button onClick={() => { setActiveSection("trash"); fetchDeletedCourses(); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeSection === "trash" ? "bg-red-500 text-white" : "bg-card border border-border text-main hover:bg-canvas-alt"}`}>
                  🗑️ Trash ({deletedCourses.length})
                </button>
              </div>
            </div>

            {/* ── ACTIVE COURSES ── */}
            {activeSection === "courses" && (
              <>
                {/* Add Course Form */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <h2 className="text-lg font-bold text-main mb-4">➕ Add New Course</h2>
                  <form onSubmit={handleAddCourse} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <input value={newCourse.title} onChange={e => setNewCourse(p => ({ ...p, title: e.target.value }))} placeholder="Course Title*" required className="p-2.5 border border-border rounded-lg bg-input text-main text-sm sm:col-span-2" />
                    <input value={newCourse.category} onChange={e => setNewCourse(p => ({ ...p, category: e.target.value }))} placeholder="Category*" required className="p-2.5 border border-border rounded-lg bg-input text-main text-sm" />
                    <select value={newCourse.level} onChange={e => setNewCourse(p => ({ ...p, level: e.target.value }))} required className="p-2.5 border border-border rounded-lg bg-input text-main text-sm">
                      <option value="" disabled>Level*</option>
                      <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                    </select>
                    <input type="number" step="0.1" value={newCourse.rating} onChange={e => setNewCourse(p => ({ ...p, rating: e.target.value }))} placeholder="Rating (4.5)" required className="p-2.5 border border-border rounded-lg bg-input text-main text-sm" />
                    <input value={newCourse.students} onChange={e => setNewCourse(p => ({ ...p, students: e.target.value }))} placeholder="Students (e.g. 1.2k students)" required className="p-2.5 border border-border rounded-lg bg-input text-main text-sm" />
                    <input value={newCourse.lessons} onChange={e => setNewCourse(p => ({ ...p, lessons: e.target.value }))} placeholder="Lessons (e.g. 20 lessons)" required className="p-2.5 border border-border rounded-lg bg-input text-main text-sm" />
                    <input value={newCourse.price} onChange={e => setNewCourse(p => ({ ...p, price: e.target.value }))} placeholder="Price (e.g. ₹999 or Free)" required className="p-2.5 border border-border rounded-lg bg-input text-main text-sm" />

                    {/* Image Upload */}
                    <div className="sm:col-span-2 lg:col-span-4">
                      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={e => { if (e.target.files[0]) uploadCourseImage(e.target.files[0]); }} />
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={imageUploading} className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg bg-input text-main text-sm hover:border-blue-500 hover:text-blue-500 transition disabled:opacity-50">
                          <span>📷</span><span>{imageUploading ? "Uploading…" : "Add Image"}</span><span className="text-xs">↓</span>
                        </button>
                        {imagePreview && (
                          <div className="flex items-center gap-2">
                            <img src={imagePreview} alt="Preview" className="w-10 h-10 rounded-lg object-cover border border-border" />
                            {newCourse.image && !imageUploading && <span className="text-xs text-green-600 font-medium">✓ Uploaded</span>}
                            {imageUploading && <span className="text-xs text-muted animate-pulse">Uploading…</span>}
                            {!imageUploading && <button type="button" onClick={() => { setImagePreview(null); setNewCourse(p => ({ ...p, image: "" })); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-red-500 hover:text-red-700 text-xs font-bold">✕</button>}
                          </div>
                        )}
                        {!imagePreview && <span className="text-xs text-muted">No image selected</span>}
                      </div>
                    </div>

                    <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                      <button type="submit" disabled={imageUploading || !newCourse.image} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-medium transition">
                        {imageUploading ? "Uploading image…" : "Create Course"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Course List */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <h2 className="text-lg font-bold text-main mb-4">📚 Existing Courses</h2>
                  <div className="space-y-3 max-h-[calc(100vh-24rem)] overflow-y-auto pr-1">
                    {courses.length === 0 ? (
                      <p className="text-muted text-center py-10">No courses yet. Add one above.</p>
                    ) : courses.map(course => (
                      <div key={course.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border border-border rounded-lg bg-canvas hover:bg-canvas-alt transition">
                        <div className="flex items-center gap-3">
                          {course.image && <img src={course.image} alt={course.title} className="w-14 h-14 rounded-lg object-cover hidden sm:block flex-shrink-0" />}
                          <div>
                            <p className="font-semibold text-main">{course.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{course.category}</span>
                              <span className="text-xs text-muted">{course.level}</span>
                              <span className="text-xs text-muted">⭐ {course.rating}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 self-end sm:self-auto flex-shrink-0">
                          <button onClick={() => setEditCourse(course)} className="bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 px-3 py-1.5 rounded-lg text-sm font-medium transition">✏️ Edit</button>
                          <button onClick={() => handleManageLessons(course.id)} className="bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-sm font-medium transition">📝 Lessons</button>
                          <button onClick={() => handleDeleteCourse(course.id)} className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-3 py-1.5 rounded-lg text-sm font-medium transition">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── TRASH ── */}
            {activeSection === "trash" && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-lg font-bold text-main mb-1">🗑️ Deleted Courses</h2>
                <p className="text-muted text-sm mb-4">Restore courses to make them visible again, or permanently delete them.</p>
                <div className="space-y-3 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
                  {deletedCourses.length === 0 ? (
                    <p className="text-muted text-center py-10">Trash is empty.</p>
                  ) : deletedCourses.map(course => (
                    <div key={course.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border border-red-100 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {course.image && <img src={course.image} alt={course.title} className="w-14 h-14 rounded-lg object-cover hidden sm:block opacity-60 flex-shrink-0" />}
                        <div>
                          <p className="font-semibold text-main line-through opacity-70">{course.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{course.category}</span>
                            {course.deletedAt && <span className="text-xs text-muted">Deleted {new Date(course.deletedAt).toLocaleString()}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 self-end sm:self-auto flex-shrink-0">
                        <button onClick={() => handleRestoreCourse(course.id)} className="bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 px-3 py-1.5 rounded-lg text-sm font-medium transition">↩ Restore</button>
                        <button onClick={() => setConfirmModal({ type: "permanent", course })} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition">🗑️ Delete Forever</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ── Confirmation Popup ── */}
      {confirmModal?.type === "permanent" && (
        <ConfirmModal
          title="Permanently Delete Course?"
          message={`"${confirmModal.course.title}" will be deleted forever and cannot be recovered.`}
          confirmLabel="Delete Forever"
          onConfirm={() => handlePermanentDelete(confirmModal.course.id)}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* ── Edit Course Modal ── */}
      {editCourse && (
        <EditCourseModal course={editCourse} onClose={() => setEditCourse(null)} onSave={handleEditSave} token={token} />
      )}

      {/* ── Lesson Management Modal ── */}
      {lessonCourse && (
        <LessonModal
          courseData={lessonCourse}
          courseId={lessonCourse.courseId}
          onClose={() => setLessonCourse(null)}
          token={token}
        />
      )}
    </div>
  );
};

export default AdminPage;
