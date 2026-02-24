/*********************** OLD CODE (COMMENTED FOR VERCEL) ************************/

/*
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
const messageRoutes = require("./routes/messageRoutes");
const fileRoutes = require("./routes/fileRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const userRoutes = require("./routes/userRoutes");
const { requireDB } = require("./middleware/requireDB");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

connectDB();

app.use("/api/auth", requireDB, authRoutes);
app.use("/api/projects", requireDB, projectRoutes);
app.use("/api/tasks", requireDB, taskRoutes);
app.use("/api/messages", requireDB, messageRoutes);
app.use("/api/files", requireDB, fileRoutes);
app.use("/api/analytics", requireDB, analyticsRoutes);
app.use("/api/users", requireDB, userRoutes);

app.get("/", (req, res) => {
  res.json({ message: "DevCollab API is running" });
});

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
*/


/*********************** NEW CODE (VERCEL SERVERLESS COMPATIBLE) ************************/

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { requireDB } = require("./middleware/requireDB");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Connect DB (important: should not use process.exit)
connectDB();

// Routes
app.use("/api/auth", requireDB, authRoutes);
app.use("/api/projects", requireDB, projectRoutes);
app.use("/api/tasks", requireDB, taskRoutes);
app.use("/api/messages", requireDB, messageRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "DevCollab API is running on Vercel 🚀" });
});

// IMPORTANT: Export app instead of listen()
module.exports = app;
