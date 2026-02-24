const Task = require("../models/Task");
const { getProjectIfMember } = require("../utils/projectAccess");

exports.createTask = async (req, res) => {
  try {
    const { title, description, status, assignedTo, projectId, deadline } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: "projectId is required" });
    }
    const access = await getProjectIfMember(projectId, req.user._id);
    if (!access.project) {
      return res.status(access.code).json({ message: access.message });
    }

    const task = await Task.create({
      title,
      description,
      status,
      assignedTo,
      projectId,
      deadline,
    });

    return res.status(201).json(task);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getTasksByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const access = await getProjectIfMember(projectId, req.user._id);
    if (!access.project) {
      return res.status(access.code).json({ message: access.message });
    }

    const tasks = await Task.find({ projectId })
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });
    return res.json(tasks);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { title, description, status, assignedTo, deadline } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const access = await getProjectIfMember(task.projectId, req.user._id);
    if (!access.project) {
      return res.status(access.code).json({ message: access.message });
    }

    if (title) task.title = title;
    if (description) task.description = description;
    if (status) task.status = status;
    if (assignedTo) task.assignedTo = assignedTo;
    if (deadline) task.deadline = deadline;

    const updated = await task.save();
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const access = await getProjectIfMember(task.projectId, req.user._id);
    if (!access.project) {
      return res.status(access.code).json({ message: access.message });
    }

    await task.deleteOne();
    return res.json({ message: "Task removed" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
