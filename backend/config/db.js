const mongoose = require("mongoose");
const Almanac = require("../models/Almanac");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    try {
      const almanacCollection = mongoose.connection.collection("almanacs");
      await almanacCollection.dropIndex("batch_1_yearName_1");
      console.log("Dropped legacy index batch_1_yearName_1 from almanacs");
    } catch (indexError) {
      // Ignore when the legacy index does not exist.
      if (indexError?.codeName !== "IndexNotFound") {
        console.warn("Legacy index cleanup warning:", indexError.message);
      }
    }

    await Almanac.syncIndexes();
    console.log("MongoDB Connected");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

module.exports = connectDB;