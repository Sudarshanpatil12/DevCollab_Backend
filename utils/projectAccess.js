const Project = require("../models/Project");

async function getProjectIfMember(projectId, userId) {
  const project = await Project.findById(projectId);
  if (!project) {
    return { project: null, code: 404, message: "Project not found" };
  }

  const uid = userId.toString();
  const isMember =
    project.createdBy.toString() === uid ||
    project.members.some((memberId) => memberId.toString() === uid);

  if (!isMember) {
    return { project: null, code: 403, message: "You do not have access to this project" };
  }

  return { project, code: 200, message: "" };
}

module.exports = { getProjectIfMember };
