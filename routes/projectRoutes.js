const express = require("express");
const {
  createProject,
  getProjects,
  getProjectById,
  getProjectOverview,
  updateProject,
  deleteProject,
  addMemberByEmail,
} = require("../controllers/projectController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").post(protect, createProject).get(protect, getProjects);

router.get("/:id/overview", protect, getProjectOverview);

router
  .route("/:id")
  .get(protect, getProjectById)
  .put(protect, updateProject)
  .delete(protect, deleteProject);

router.post("/:id/members", protect, addMemberByEmail);

module.exports = router;
