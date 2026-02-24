const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  uploadProjectFile,
  listProjectFiles,
  downloadProjectFile,
  deleteProjectFile,
} = require("../controllers/fileController");

const router = express.Router();

router.route("/project/:projectId").get(protect, listProjectFiles).post(protect, uploadProjectFile);
router.get("/:id/download", protect, downloadProjectFile);
router.delete("/:id", protect, deleteProjectFile);

module.exports = router;
