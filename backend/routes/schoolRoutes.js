const express = require("express");
const router = express.Router();
const controller = require("../controllers/schoolController");

router.post("/", controller.addSchool);
router.get("/", controller.getSchools);
router.put("/:id", controller.updateSchool);
router.delete("/:id", controller.deleteSchool);

module.exports = router;