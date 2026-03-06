import crypto from "crypto";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import express from "express";
import { Op } from "sequelize";

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// ================= REGISTER =================
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    res.status(201).json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
      email: user.email,
      role: user.role,
      bio: user.bio,
      purchasedCourses: user.purchasedCourses,
      token: generateToken(user.id),
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// ================= LOGIN =================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ where: { email } });

    if (user && user.password && (await user.matchPassword(password))) {
      res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio,
        purchasedCourses: user.purchasedCourses,
        token: generateToken(user.id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// ================= GOOGLE LOGIN =================
router.post("/google-login", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "ID token required" });
    }

    // Decode Firebase ID token (client verified)
    const payload = JSON.parse(
      Buffer.from(idToken.split(".")[1], "base64").toString()
    );

    const uid = payload.sub;
    const email = payload.email;
    const name = payload.name || email.split("@")[0];

    let user = await User.findOne({ where: { email } });

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId: uid,
        role: "user",
      });
    }

    const token = generateToken(user.id);

    res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
      email: user.email,
      role: user.role,
      bio: user.bio,
      purchasedCourses: user.purchasedCourses,
      token,
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({ message: "Google login failed" });
  }
});

// ================= FORGOT PASSWORD =================
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set expiry (1 hour)
    user.resetPasswordExpires = Date.now() + 3600000;

    await user.save();

    // 🚩 SIMULATED EMAIL SENDING
    // In a real app, you would send this via email.
    // For now, we return it in the response for testing purposes as requested.
    res.status(200).json({
      message: "Reset token generated",
      resetToken, // This would normally be in the email link
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// ================= RESET PASSWORD =================
router.post("/reset-password/:token", async (req, res) => {
  const { password } = req.body;

  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { [Op.gt]: Date.now() },
      },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Set new password
    user.set("password", password);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;
