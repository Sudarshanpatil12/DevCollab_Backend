const mongoose = require("mongoose");
const Project = require("../models/Project");
const User = require("../models/User");
const Task = require("../models/Task");
const Message = require("../models/Message");
const ProjectFile = require("../models/ProjectFile");

function normalizeMemberIds(rawMembers, creatorId) {
  const creator = creatorId.toString();
  const ids = new Set([creator]);
  if (Array.isArray(rawMembers)) {
    for (const memberId of rawMembers) {
      const value = String(memberId || "").trim();
      if (mongoose.Types.ObjectId.isValid(value)) ids.add(value);
    }
  }
  return [...ids];
}

function isProjectMember(project, userId) {
  const uid = userId.toString();
  return (
    project.createdBy.toString() === uid ||
    project.members.some((memberId) => memberId.toString() === uid)
  );
}

exports.createProject = async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    const description = String(req.body?.description || "").trim();
    const deadline = req.body?.deadline || null;

    if (!title) {
      return res.status(400).json({ message: "Project title is required" });
    }

    const memberIds = normalizeMemberIds(req.body?.members, req.user._id);
    const existingUsers = await User.find({ _id: { $in: memberIds } }).select("_id");
    const validMemberIds = existingUsers.map((u) => u._id);

    const project = await Project.create({
      title: title.slice(0, 120),
      description: description.slice(0, 2000),
      members: validMemberIds,
      deadline,
      createdBy: req.user._id,
    });

    await User.updateMany(
      { _id: { $in: validMemberIds } },
      { $addToSet: { projects: project._id } }
    );

    const populated = await Project.findById(project._id)
      .populate("members", "name email role")
      .populate("createdBy", "name email");

    return res.status(201).json(populated);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ createdBy: req.user._id }, { members: req.user._id }],
    })
      .populate("members", "name email role")
      .populate("createdBy", "name email")
      .sort({ updatedAt: -1 });

    return res.json(projects);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("members", "name email role")
      .populate("createdBy", "name email");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (!isProjectMember(project, req.user._id)) {
      return res.status(403).json({ message: "You do not have access to this project" });
    }

    return res.json(project);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getProjectOverview = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("members", "name email role")
      .populate("createdBy", "name email role");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (!isProjectMember(project, req.user._id)) {
      return res.status(403).json({ message: "You do not have access to this project" });
    }

    const [tasks, messages, files, filesCount, messagesCount] = await Promise.all([
      Task.find({ projectId: project._id }).populate("assignedTo", "name email"),
      Message.find({ projectId: project._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("sender", "name email"),
      ProjectFile.find({ projectId: project._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("uploadedBy", "name email role")
        .select("-data"),
      ProjectFile.countDocuments({ projectId: project._id }),
      Message.countDocuments({ projectId: project._id }),
    ]);

    const completion = {
      total: tasks.length,
      completed: tasks.filter((task) => task.status === "Completed").length,
      inProgress: tasks.filter((task) => task.status === "In Progress").length,
      todo: tasks.filter((task) => task.status === "To Do").length,
    };
    completion.progressPct = completion.total
      ? Math.round((completion.completed / completion.total) * 100)
      : 0;

    return res.json({
      project,
      summary: {
        completion,
        members: project.members.length,
        files: filesCount,
        recentMessages: messagesCount,
      },
      recent: {
        tasks: tasks.slice(0, 20),
        messages,
        files,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", reason: error.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only project creator can update project" });
    }

    const nextTitle = req.body?.title;
    const nextDescription = req.body?.description;
    const nextDeadline = req.body?.deadline;
    const nextMembers = req.body?.members;

    if (typeof nextTitle === "string" && nextTitle.trim()) {
      project.title = nextTitle.trim().slice(0, 120);
    }
    if (typeof nextDescription === "string") {
      project.description = nextDescription.trim().slice(0, 2000);
    }
    if (nextDeadline !== undefined) {
      project.deadline = nextDeadline || null;
    }

    if (Array.isArray(nextMembers)) {
      const normalized = normalizeMemberIds(nextMembers, project.createdBy);
      const existingUsers = await User.find({ _id: { $in: normalized } }).select("_id");
      const validMemberIds = existingUsers.map((u) => u._id.toString());

      const prevMemberIds = new Set(project.members.map((id) => id.toString()));
      const nextMemberIds = new Set(validMemberIds);

      project.members = validMemberIds;

      const added = [...nextMemberIds].filter((id) => !prevMemberIds.has(id));
      const removed = [...prevMemberIds].filter((id) => !nextMemberIds.has(id));

      if (added.length) {
        await User.updateMany({ _id: { $in: added } }, { $addToSet: { projects: project._id } });
      }
      if (removed.length) {
        await User.updateMany({ _id: { $in: removed } }, { $pull: { projects: project._id } });
      }
    }

    await project.save();

    const updated = await Project.findById(project._id)
      .populate("members", "name email role")
      .populate("createdBy", "name email");

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.addMemberByEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const projectId = req.params.id;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only project creator can manage members" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User with this email not found" });
    }

    const alreadyMember = project.members.some(
      (m) => m.toString() === user._id.toString()
    );
    if (alreadyMember || project.createdBy.toString() === user._id.toString()) {
      return res.status(400).json({ message: "User is already a member of this project" });
    }

    project.members.push(user._id);
    await project.save();

    await User.updateOne(
      { _id: user._id },
      { $addToSet: { projects: project._id } }
    );

    const populated = await Project.findById(projectId)
      .populate("members", "name email role")
      .populate("createdBy", "name email");

    return res.json(populated);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only project creator can delete project" });
    }

    await Promise.all([
      Task.deleteMany({ projectId: project._id }),
      Message.deleteMany({ projectId: project._id }),
      ProjectFile.deleteMany({ projectId: project._id }),
      User.updateMany({ projects: project._id }, { $pull: { projects: project._id } }),
      project.deleteOne(),
    ]);

    return res.json({ message: "Project removed" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
