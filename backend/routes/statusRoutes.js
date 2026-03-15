const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  createStatus, getStatuses, viewStatus,
  deleteStatus, updatePrivacy, getMyStatuses,
  uploadStatusMiddleware
} = require("../controllers/statusController");

router.get("/",           auth, getStatuses);
router.get("/mine",       auth, getMyStatuses);
router.post("/",          auth, uploadStatusMiddleware.single("media"), createStatus);
router.post("/:id/view",  auth, viewStatus);
router.put("/:id/privacy",auth, updatePrivacy);
router.delete("/:id",     auth, deleteStatus);

module.exports = router;