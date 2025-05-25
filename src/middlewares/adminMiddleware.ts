import { NextFunction, Response } from "express";
import { AuthRequest } from "./authMiddleware";

export const isAdmin = (req:AuthRequest,res:Response,next:NextFunction) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({message:"Admin only"})
    }
    next();
}