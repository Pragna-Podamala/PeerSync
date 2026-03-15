const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const g = require("../controllers/groupController");

router.post("/",                               auth, g.uploadMiddleware.single("groupPic"), g.createGroup);
router.get("/",                                auth, g.getMyGroups);
router.get("/:id",                             auth, g.getGroup);
router.put("/:id",                             auth, g.uploadMiddleware.single("groupPic"), g.updateGroup);
router.post("/join/:link",                     auth, g.joinByLink);
router.post("/:id/add",                        auth, g.addMember);
router.post("/:id/remove",                     auth, g.removeMember);
router.post("/:id/make-admin",                 auth, g.makeAdmin);
router.post("/:id/leave",                      auth, g.leaveGroup);
router.post("/:id/regen-link",                 auth, g.regenLink);
router.get("/:id/messages",                    auth, g.getGroupMessages);
router.put("/:groupId/messages/:msgId/delete", auth, g.deleteGroupMsg);
router.post("/:groupId/messages/:msgId/view",  auth, g.viewOneTime);

// Join requests
router.post("/:id/request-join",               auth, g.requestJoin);
router.post("/:id/approve-join",               auth, g.approveJoin);
router.post("/:id/decline-join",               auth, g.declineJoin);

// Polls
router.post("/:id/polls",                      auth, g.createPoll);
router.post("/:id/polls/:pollId/vote",         auth, g.votePoll);
router.get("/:id/polls",                       auth, g.getPolls);

module.exports = router;