require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const express = require("express");
const http = require("http");
const cors = require("cors");
const morgan = require("morgan");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");
const { requireDB } = require("./middleware/requireDB");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Attach io to app so we can use in routes/controllers if needed
app.set("io", io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// DB Connection
connectDB();

// Routes (require DB so you get a clear error instead of timeout)
app.use("/api/auth", requireDB, authRoutes);
app.use("/api/projects", requireDB, projectRoutes);
app.use("/api/tasks", requireDB, taskRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "DevCollab API is running" });
});

// Socket.io
io.on("connection", (socket) => {
  console.log("New client connected", socket.id);

  socket.on("joinProject", (projectId) => {
    socket.join(projectId);
  });

  socket.on("sendMessage", (data) => {
    io.to(data.projectId).emit("receiveMessage", data);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
  });
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});