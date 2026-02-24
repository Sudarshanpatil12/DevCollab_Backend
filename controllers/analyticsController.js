const Task = require("../models/Task");
const Project = require("../models/Project");
const { getProjectIfMember } = require("../utils/projectAccess");

function buildCompletionStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.status === "Completed").length;
  const inProgress = tasks.filter((task) => task.status === "In Progress").length;
  const todo = tasks.filter((task) => task.status === "To Do").length;
  const progressPct = total ? Math.round((completed / total) * 100) : 0;

  return { total, completed, inProgress, todo, progressPct };
}

exports.getProjectAnalytics = async (req, res) => {
  try {
    const { projectId } = req.params;
    const access = await getProjectIfMember(projectId, req.user._id);
    if (!access.project) {
      return res.status(access.code).json({ message: access.message });
    }

    const tasks = await Task.find({ projectId }).populate("assignedTo", "name email");
    const stats = buildCompletionStats(tasks);
    const now = new Date();

    const byUserMap = new Map();
    for (const task of tasks) {
      const key = task.assignedTo?._id?.toString() || "unassigned";
      if (!byUserMap.has(key)) {
        byUserMap.set(key, {
          userId: key === "unassigned" ? null : key,
          name: task.assignedTo?.name || "Unassigned",
          total: 0,
          completed: 0,
          inProgress: 0,
          overdue: 0,
        });
      }
      const entry = byUserMap.get(key);
      entry.total += 1;
      if (task.status === "Completed") entry.completed += 1;
      if (task.status === "In Progress") entry.inProgress += 1;
      if (task.deadline && task.status !== "Completed" && new Date(task.deadline) < now) {
        entry.overdue += 1;
      }
    }

    const teamPerformance = [...byUserMap.values()].map((entry) => ({
      ...entry,
      completionRate: entry.total ? Math.round((entry.completed / entry.total) * 100) : 0,
    }));

    const last7Days = {};
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      last7Days[key] = 0;
    }
    for (const task of tasks) {
      if (task.status !== "Completed" || !task.updatedAt) continue;
      const key = new Date(task.updatedAt).toISOString().slice(0, 10);
      if (last7Days[key] !== undefined) last7Days[key] += 1;
    }

    return res.json({
      projectId,
      completion: stats,
      teamPerformance,
      completionTrend: Object.entries(last7Days).map(([date, completed]) => ({ date, completed })),
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getOverviewAnalytics = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ createdBy: req.user._id }, { members: req.user._id }],
    }).select("_id title");

    const projectIds = projects.map((p) => p._id);
    const tasks = await Task.find({ projectId: { $in: projectIds } });

    const completion = buildCompletionStats(tasks);
    const projectProgress = projects.map((project) => {
      const projectTasks = tasks.filter((task) => task.projectId.toString() === project._id.toString());
      const projectCompletion = buildCompletionStats(projectTasks);
      return {
        projectId: project._id,
        title: project.title,
        ...projectCompletion,
      };
    });

    return res.json({
      projects: projects.length,
      completion,
      projectProgress,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
