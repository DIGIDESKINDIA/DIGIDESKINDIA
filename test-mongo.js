const mongoose = require("mongoose");

const uri = process.env.MONGODB_URI;

console.log("Connecting to MongoDB...");

mongoose
  .connect(uri)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:");
    console.error(err);
    process.exit(1);
  });