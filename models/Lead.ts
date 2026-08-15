import mongoose from "mongoose";

const LeadSchema = new mongoose.Schema(
  {
    name: String,
    mobile: String,
    service: String,
    message: String,

    status: {
      type: String,
      default: "New",
    },
  },
  {
    timestamps: true,
  }
);

export default
  mongoose.models.Lead ||
  mongoose.model("Lead", LeadSchema);