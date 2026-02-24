const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ["To Do", "In Progress", "Completed"],
      default: "To Do",
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    deadline: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);