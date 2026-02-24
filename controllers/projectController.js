const Project = require("../models/Project");
const User = require("../models/User");

exports.createProject = async (req, res) => {
  try {
    const { title, description, members, deadline } = req.body;

    const memberIds = Array.isArray(members) ? [...members] : [];
    if (!memberIds.includes(req.user._id.toString())) {
      memberIds.push(req.user._id);
    }

    const project = await Project.create({
      title,
      description,
      members: memberIds,
      deadline,
      createdBy: req.user._id,
    });

    if (memberIds.length > 0) {
      await User.updateMany(
        { _id: { $in: memberIds } },
        { $addToSet: { projects: project._id } }
      );
    }

    return res.status(201).json(project);
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
      .populate("createdBy", "name email");

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

    const isMember =
      project.createdBy._id.toString() === req.user._id.toString() ||
      project.members.some((m) => m._id.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: "You do not have access to this project" });
    }

    return res.json(project);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const { title, description, members, deadline } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.createdBy.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Only project creator can update project" });
    }

    project.title = title || project.title;
    project.description = description || project.description;
    project.deadline = deadline || project.deadline;
    if (members) {
      project.members = members;
    }

    const updated = await project.save();
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

    // Only project creator can manage members (route already limited to Admin role)
    if (project.createdBy.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Only project creator can manage members" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User with this email not found" });
    }

    const alreadyMember = project.members.some(
      (m) => m.toString() === user._id.toString()
    );
    if (alreadyMember) {
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
      return res
        .status(403)
        .json({ message: "Only project creator can delete project" });
    }

    await project.deleteOne();
    return res.json({ message: "Project removed" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};