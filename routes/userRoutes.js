const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getMyProfile } = require("../controllers/userController");

const router = express.Router();

router.get("/me/profile", protect, getMyProfile);

module.exports = router;
