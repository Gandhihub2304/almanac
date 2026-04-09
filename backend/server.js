const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/api/almanac", require("./routes/almanacRoutes"));
app.use("/api/schools", require("./routes/schoolRoutes"));

app.listen(process.env.PORT, () =>
  console.log("Server running on port 5000")
);