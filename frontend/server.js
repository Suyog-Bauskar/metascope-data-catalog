const express = require("express");
const path = require("path");
const app = express();

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", message: "Frontend server running" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Frontend server running on port ${PORT}`);
});
