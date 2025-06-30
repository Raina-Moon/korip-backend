import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";

export interface AuthRequest extends Request {
  user?: { userId: number; role: string };
}

export const authToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];

  // const token = req.cookies.accessToken;
  // if (!token) {
  //   res.status(401).json({ message: "No token provided" });
  //   return;
  // }

  try {
    const decoded = verifyAccessToken(token) as {
      userId: number;
      role: string;
    };

    req.user = { userId: decoded.userId, role: decoded.role };
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};
