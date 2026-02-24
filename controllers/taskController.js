const Task = require("../models/Task");
const Project = require("../models/Project");

const canAccessProject = async (userId, projectId) => {
  const project = await Project.findById(projectId);
  if (!project) return false;
  const id = userId.toString();
  if (project.createdBy.toString() === id) return true;
  return project.members.some((m) => m.toString() === id);
};

exports.createTask = async (req, res) => {
  try {
    const { title, description, status, assignedTo, projectId, deadline } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: "projectId is required" });
    }
    const allowed = await canAccessProject(req.user._id, projectId);
    if (!allowed) {
      return res.status(403).json({ message: "You do not have access to this project" });
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
    const allowed = await canAccessProject(req.user._id, projectId);
    if (!allowed) {
      return res.status(403).json({ message: "You do not have access to this project" });
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

    await task.deleteOne();
    return res.json({ message: "Task removed" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};