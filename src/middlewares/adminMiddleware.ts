import { NextFunction, Response } from "express";
import { AuthRequest } from "./authMiddleware";

export const isAdmin = (req:AuthRequest,res:Response,next:NextFunction):void => {
    if (req.user?.role !== "ADMIN") {
        res.status(403).json({message:"Admin only"});
        return;
    }
    next();
}