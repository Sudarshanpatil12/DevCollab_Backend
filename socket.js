const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const { getProjectIfMember } = require("./utils/projectAccess");

function getTokenFromHandshake(socket) {
  const authToken = socket.handshake?.auth?.token;
  if (typeof authToken === "string" && authToken.trim()) {
    return authToken.trim();
  }

  const header = socket.handshake?.headers?.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }

  return "";
}

function createSocketServer(httpServer, corsOrigin) {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = getTokenFromHandshake(socket);
      if (!token) return next(new Error("Unauthorized: missing token"));

      const secret = process.env.JWT_SECRET;
      if (!secret) return next(new Error("Server misconfiguration"));

      const decoded = jwt.verify(token, secret);
      const user = await User.findById(decoded.id).select("_id name email role");
      if (!user) return next(new Error("Unauthorized: user not found"));

      socket.data.user = user;
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join_project", async (projectId, ack) => {
      try {
        const access = await getProjectIfMember(projectId, socket.data.user._id);
        if (!access.project) {
          if (typeof ack === "function") ack({ ok: false, message: access.message });
          return;
        }

        socket.join(`project:${projectId}`);
        if (typeof ack === "function") ack({ ok: true });
      } catch {
        if (typeof ack === "function") ack({ ok: false, message: "Failed to join project room" });
      }
    });

    socket.on("leave_project", (projectId) => {
      socket.leave(`project:${projectId}`);
    });
  });

  return io;
}

module.exports = { createSocketServer };
