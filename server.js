require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./config/db");
const { createSocketServer } = require("./socket");

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");
const messageRoutes = require("./routes/messageRoutes");
const fileRoutes = require("./routes/fileRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const userRoutes = require("./routes/userRoutes");
const { requireDB } = require("./middleware/requireDB");

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "6mb" }));
app.use(express.urlencoded({ extended: true, limit: "6mb" }));
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

if (require.main === module) {
  const port = Number(process.env.PORT) || 5001;
  const httpServer = http.createServer(app);
  const io = createSocketServer(httpServer, corsOrigin);
  app.set("io", io);
  httpServer.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = app;
