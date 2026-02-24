const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getMessagesByProject,
  createMessage,
} = require("../controllers/messageController");

const router = express.Router();

router
  .route("/project/:projectId")
  .get(protect, getMessagesByProject)
  .post(protect, createMessage);

module.exports = router;
