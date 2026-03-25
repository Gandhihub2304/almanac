const express = require("express");
const router = express.Router();
const {
	saveAlmanac,
	getAlmanacBatches,
	getAlmanacById
} = require("../controllers/almanacController");

router.post("/", saveAlmanac);
router.get("/batches", getAlmanacBatches);
router.get("/:id", getAlmanacById);

module.exports = router;