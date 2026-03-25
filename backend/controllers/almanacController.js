const Almanac = require("../models/Almanac");

exports.saveAlmanac = async (req, res) => {
  try {
    const { program, year, batchStart, batchEnd, yearsData } = req.body;

    if (!program || !year || !batchStart || !batchEnd || !Array.isArray(yearsData)) {
      return res.status(400).json({ message: "Missing required almanac fields" });
    }

    const parsedYear = Number(year);
    const parsedBatchStart = Number(batchStart);
    const parsedBatchEnd = Number(batchEnd);

    if (Number.isNaN(parsedYear) || Number.isNaN(parsedBatchStart) || Number.isNaN(parsedBatchEnd)) {
      return res.status(400).json({ message: "Year and batch values must be numbers" });
    }

    if (parsedBatchEnd < parsedBatchStart) {
      return res.status(400).json({ message: "Batch end cannot be smaller than batch start" });
    }

    const filter = {
      program,
      year: parsedYear,
      batchStart: parsedBatchStart,
      batchEnd: parsedBatchEnd
    };

    const existing = await Almanac.findOne(filter).lean();

    const savedAlmanac = await Almanac.findOneAndUpdate(
      filter,
      {
        $set: {
          yearsData
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    res.json({
      message: existing ? "Almanac updated for this batch" : "Almanac saved for this batch",
      almanac: savedAlmanac
    });

  } catch (error) {
    console.error("BACKEND ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getAlmanacBatches = async (req, res) => {
  try {
    const batches = await Almanac.find(
      {},
      {
        program: 1,
        year: 1,
        batchStart: 1,
        batchEnd: 1,
        updatedAt: 1
      }
    )
      .sort({ batchStart: -1, batchEnd: -1, program: 1, year: 1 })
      .lean();

    res.json(batches);
  } catch (error) {
    console.error("BATCH LIST ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getAlmanacById = async (req, res) => {
  try {
    const almanac = await Almanac.findById(req.params.id).lean();

    if (!almanac) {
      return res.status(404).json({ message: "Almanac not found" });
    }

    res.json(almanac);
  } catch (error) {
    console.error("GET ALMANAC ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};