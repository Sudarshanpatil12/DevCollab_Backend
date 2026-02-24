const express = require("express");
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMemberByEmail,
} = require("../controllers/projectController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").post(protect, authorizeRoles("Admin"), createProject).get(protect, getProjects);

router
  .route("/:id")
  .get(protect, getProjectById)
  .put(protect, authorizeRoles("Admin"), updateProject)
  .delete(protect, authorizeRoles("Admin"), deleteProject);

router.post("/:id/members", protect, authorizeRoles("Admin"), addMemberByEmail);

module.exports = router;