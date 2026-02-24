const Task = require("../models/Task");
const Project = require("../models/Project");
const Message = require("../models/Message");
const ProjectFile = require("../models/ProjectFile");

exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const [projects, assignedTasks, messages, uploadedFiles] = await Promise.all([
      Project.find({
        $or: [{ createdBy: userId }, { members: userId }],
      }).select("_id title createdAt"),
      Task.find({ assignedTo: userId })
        .populate("projectId", "title")
        .sort({ updatedAt: -1 }),
      Message.find({ sender: userId })
        .populate("projectId", "title")
        .sort({ createdAt: -1 })
        .limit(20),
      ProjectFile.find({ uploadedBy: userId })
        .populate("projectId", "title")
        .select("-data")
        .sort({ createdAt: -1 })
        .limit(20),
    ]);

    const completedTasks = assignedTasks.filter((task) => task.status === "Completed").length;
    const recentTaskHistory = assignedTasks.slice(0, 20).map((task) => ({
      id: task._id,
      title: task.title,
      status: task.status,
      projectTitle: task.projectId?.title || "Unknown Project",
      updatedAt: task.updatedAt,
    }));

    const messageHistory = messages.map((msg) => ({
      id: msg._id,
      message: msg.message,
      projectTitle: msg.projectId?.title || "Unknown Project",
      createdAt: msg.createdAt,
    }));

    const fileHistory = uploadedFiles.map((file) => ({
      id: file._id,
      name: file.name,
      size: file.size,
      contentType: file.contentType,
      projectTitle: file.projectId?.title || "Unknown Project",
      createdAt: file.createdAt,
    }));

    return res.json({
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        createdAt: req.user.createdAt,
      },
      stats: {
        projects: projects.length,
        assignedTasks: assignedTasks.length,
        completedTasks,
        completionRate: assignedTasks.length
          ? Math.round((completedTasks / assignedTasks.length) * 100)
          : 0,
        messagesSent: messages.length,
        filesUploaded: uploadedFiles.length,
      },
      history: {
        tasks: recentTaskHistory,
        messages: messageHistory,
        files: fileHistory,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
