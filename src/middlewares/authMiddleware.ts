import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export const authToken = ((req:Request,res:Response,next:NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ message: "Unauthorized" });
        return
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
            userId : number
        };
        (req as any).user = {userId : decoded.userId};
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
})