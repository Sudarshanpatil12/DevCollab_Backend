const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getProjectAnalytics,
  getOverviewAnalytics,
} = require("../controllers/analyticsController");

const router = express.Router();

router.get("/overview", protect, getOverviewAnalytics);
router.get("/project/:projectId", protect, getProjectAnalytics);

module.exports = router;
