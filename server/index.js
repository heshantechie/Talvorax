import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

// Global request logger
app.use((req, res, next) => {
  console.log("Incoming request:", req.method, req.url);
  next();
});

// Health check route
app.get("/api/health", (req, res) => {
  console.log("Health endpoint hit");
  res.status(200).send("OK");
});

// Fallback route for debugging
app.use((req, res) => {
  console.log("Unknown route:", req.url);
  res.status(404).send("Not Found");
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
