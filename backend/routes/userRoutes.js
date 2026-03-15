const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  getAllUsers,
  getUser,
  updateProfile,
  uploadProfilePic,
  followUser,
  unfollowUser,
  blockUser,
  unblockUser,
  upload
} = require("../controllers/userController");

router.get("/", auth, getAllUsers);
router.get("/:username", auth, getUser);
router.put("/me/profile", auth, updateProfile);
router.post("/me/pic", auth, upload.single("profilePic"), uploadProfilePic);
router.post("/:username/follow", auth, followUser);
router.post("/:username/unfollow", auth, unfollowUser);
router.post("/:username/block", auth, blockUser);
router.post("/:username/unblock", auth, unblockUser);

module.exports = router;
