const ProjectFile = require("../models/ProjectFile");
const { getProjectIfMember } = require("../utils/projectAccess");

const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024;

exports.uploadProjectFile = async (req, res) => {
  try {
    const { projectId } = req.params;
    const access = await getProjectIfMember(projectId, req.user._id);
    if (!access.project) {
      return res.status(access.code).json({ message: access.message });
    }

    const { name, contentType, size, dataBase64 } = req.body || {};
    if (!name || !contentType || !size || !dataBase64) {
      return res.status(400).json({ message: "name, contentType, size and dataBase64 are required" });
    }

    const fileSize = Number(size);
    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({ message: "Invalid file size. Maximum allowed is 3MB" });
    }

    const fileBuffer = Buffer.from(dataBase64, "base64");
    if (!fileBuffer.length || fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({ message: "Invalid file payload. Maximum allowed is 3MB" });
    }

    const created = await ProjectFile.create({
      projectId,
      uploadedBy: req.user._id,
      name: String(name).slice(0, 160),
      contentType: String(contentType).slice(0, 120),
      size: fileBuffer.length,
      data: fileBuffer,
    });

    const populated = await ProjectFile.findById(created._id)
      .populate("uploadedBy", "name email role")
      .select("-data");

    return res.status(201).json(populated);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.listProjectFiles = async (req, res) => {
  try {
    const { projectId } = req.params;
    const access = await getProjectIfMember(projectId, req.user._id);
    if (!access.project) {
      return res.status(access.code).json({ message: access.message });
    }

    const files = await ProjectFile.find({ projectId })
      .populate("uploadedBy", "name email role")
      .select("-data")
      .sort({ createdAt: -1 });

    return res.json(files);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.downloadProjectFile = async (req, res) => {
  try {
    const file = await ProjectFile.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const access = await getProjectIfMember(file.projectId, req.user._id);
    if (!access.project) {
      return res.status(access.code).json({ message: access.message });
    }

    res.setHeader("Content-Type", file.contentType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.name)}"`);
    return res.send(file.data);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteProjectFile = async (req, res) => {
  try {
    const file = await ProjectFile.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const access = await getProjectIfMember(file.projectId, req.user._id);
    if (!access.project) {
      return res.status(access.code).json({ message: access.message });
    }

    const isAdmin = req.user.role === "Admin";
    const isUploader = file.uploadedBy.toString() === req.user._id.toString();
    if (!isAdmin && !isUploader) {
      return res.status(403).json({ message: "Only admin or uploader can delete this file" });
    }

    await file.deleteOne();
    return res.json({ message: "File deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
