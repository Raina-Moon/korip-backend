import express from 'express';
import { fetchHotspringData } from '../services/hotspringService';

const router = express.Router();

router.get("/", async (req,res) => {
    try {
        const data = await fetchHotspringData()
        res.json(data)
    } catch (err) {
        console.error("Error fetching hotspring data:", err);
        res.status(500).json({ message: "Internal server error" });
    }
})

export default router;