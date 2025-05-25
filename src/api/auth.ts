import express from "express";

const router = express.Router();

router.post("/signup", (req, res) => {
  const { nickname, email, password } = req.body;
  if (!nickname || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  res.status(201).json({
    message: "User created successfully",
    user: {
      nickname,
      email,
    },
  });
});
