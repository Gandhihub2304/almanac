const express = require("express");
const router = express.Router();
const {
	saveAlmanac,
	getAlmanacBatches,
	getSavedCalendars,
	getAlmanacById,
	getSavedCalendarByAlmanacYear,
	getSavedCalendarById,
	saveDayWiseTable,
	deleteSavedCalendar,
	deleteSavedCalendarById,
	deleteAlmanacBatchRange
	,deleteAlmanacById
} = require("../controllers/almanacController");

router.post("/", saveAlmanac);
router.get("/batches", getAlmanacBatches);
router.get("/saved-calendars", getSavedCalendars);
router.get("/saved-calendars/:calendarId", getSavedCalendarById);
router.get("/:id", getAlmanacById);
router.get("/:id/year/:yearNumber/day-wise-table", getSavedCalendarByAlmanacYear);
router.delete("/:id", deleteAlmanacById);
router.put("/:id/year/:yearNumber/day-wise-table", saveDayWiseTable);
router.post("/:id/year/:yearNumber/day-wise-table", saveDayWiseTable);
router.delete("/:id/year/:yearNumber/day-wise-table", deleteSavedCalendar);
router.delete("/saved-calendars/:calendarId", deleteSavedCalendarById);
router.delete("/batches/:batchStart/:batchEnd", deleteAlmanacBatchRange);

module.exports = router;