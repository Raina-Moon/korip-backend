import express from "express";
import { fetchHotspringData } from "../services/hotspringService";

const router = express.Router();

router.get("/", async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  console.log("Received coordinates:", lat, lng);

  try {
    const data = await fetchHotspringData(lat, lng);
    res.json(data);
  } catch (err) {
    console.error("Error fetching hotspring data:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
