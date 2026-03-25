const School = require("../models/School");

// ✅ CREATE
exports.addSchool = async (req, res) => {
  try {
    const school = new School(req.body);
    await school.save();

    res.status(201).json(school);
  } catch (error) {
    console.error("CREATE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ READ
exports.getSchools = async (req, res) => {
  try {
    const schools = await School.find();
    res.json(schools);
  } catch (error) {
    console.error("READ ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ UPDATE (🔥 FIXED)
exports.updateSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, programs } = req.body;

    console.log("UPDATE HIT:", id, name, programs);

    const updated = await School.findByIdAndUpdate(
      id,
      {
        name: name || "",
        programs: programs || []
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "School not found ❌" });
    }

    res.json(updated);

  } catch (error) {
    console.error("UPDATE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ DELETE
exports.deleteSchool = async (req, res) => {
  try {
    await School.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully ✅" });
  } catch (error) {
    console.error("DELETE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};