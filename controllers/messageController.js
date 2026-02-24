const Message = require("../models/Message");
const Project = require("../models/Project");

async function ensureProjectMember(projectId, userId) {
  const project = await Project.findById(projectId).select("createdBy members");
  if (!project) return { ok: false, code: 404, message: "Project not found" };

  const isMember =
    project.createdBy.toString() === userId.toString() ||
    project.members.some((m) => m.toString() === userId.toString());

  if (!isMember) {
    return { ok: false, code: 403, message: "You do not have access to this project chat" };
  }

  return { ok: true };
}

exports.getMessagesByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const access = await ensureProjectMember(projectId, req.user._id);
    if (!access.ok) {
      return res.status(access.code).json({ message: access.message });
    }

    const messages = await Message.find({ projectId })
      .sort({ createdAt: 1 })
      .limit(200)
      .populate("sender", "name email");

    return res.json(messages);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.createMessage = async (req, res) => {
  try {
    const { projectId } = req.params;
    const message = (req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    const access = await ensureProjectMember(projectId, req.user._id);
    if (!access.ok) {
      return res.status(access.code).json({ message: access.message });
    }

    const created = await Message.create({
      projectId,
      sender: req.user._id,
      message,
    });

    const populated = await Message.findById(created._id).populate("sender", "name email");
    return res.status(201).json(populated);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
