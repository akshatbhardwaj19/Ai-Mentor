import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Track pending requests to avoid duplicate generation triggers
const pendingRequests = new Set();


router.post("/generate-video", async (req, res) => {
  try {
    const { course, celebrity, topic } = req.body;

    // Helper to check if file size is stable (finished writing)
    const waitForFileStability = async (filePath) => {
      let lastSize = -1;
      let stableCount = 0;
      const maxStabilityChecks = 5; // Try for up to 5 * 1s = 5s of stability

      let currentSize = 0;
      for (let i = 0; i < maxStabilityChecks; i++) {
        if (!fs.existsSync(filePath)) return false;
        const stats = fs.statSync(filePath);
        currentSize = stats.size;

        if (currentSize > 0 && currentSize === lastSize) {
          stableCount++;
          if (stableCount >= 2) return true; // Stable for 2 consecutive checks
        } else {
          stableCount = 0;
        }

        lastSize = currentSize;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      return currentSize > 0;
    };

    // Sanitise names to be safe for Windows filenames (remove ?, :, *, etc.)
    const sanitise = (s) => s.replace(/[^\w-]/g, '_');
    const videoFileName = `${sanitise(topic)}_${sanitise(celebrity)}_${sanitise(course)}.mp4`;

    console.log(`Requested Video: ${videoFileName}`);

    const aiServiceVideoPath = path.join(
      __dirname,
      "../../ai_service/outputs/video",
      videoFileName
    );
    const backendVideosFolder = path.join(__dirname, "../videos");
    const backendVideoPath = path.join(backendVideosFolder, videoFileName);

    // Ensure backend/videos exists
    if (!fs.existsSync(backendVideosFolder)) {
      fs.mkdirSync(backendVideosFolder, { recursive: true });
    }

    const txtFileName = videoFileName.replace(".mp4", ".txt");
    const backendTxtPath = path.join(backendVideosFolder, txtFileName);
    const aiServiceTxtPath = path.join(__dirname, "../../ai_service/outputs/video", txtFileName);

    const getAndCacheTranscript = async () => {
      let transcript = null;
      try {
        if (fs.existsSync(backendTxtPath)) {
          transcript = await fs.promises.readFile(backendTxtPath, "utf-8");
          console.log("📝 Transcript loaded from backend cache");
        } else if (fs.existsSync(aiServiceTxtPath)) {
          transcript = await fs.promises.readFile(aiServiceTxtPath, "utf-8");
          await fs.promises.copyFile(aiServiceTxtPath, backendTxtPath);
          console.log("📝 Transcript found in AI service, cached and loaded");
        }
      } catch (err) {
        console.error("Failed to process transcript:", err);
      }
      return transcript;
    };

    // 1. Check if video already exists in backend/videos (Cache hit)
    if (fs.existsSync(backendVideoPath)) {
      console.log("✅ Video found in backend cache!");
      const transcript = await getAndCacheTranscript();
      return res.json({
        status: "success",
        message: "Video retrieved from cache",
        videoUrl: `http://localhost:5000/videos/${videoFileName}`,
        transcript,
        topic,
        celebrity,
      });
    }

    // 2. Check if video exists in ai_service/outputs/video but not in backend/videos
    if (fs.existsSync(aiServiceVideoPath) && !videoFileName.startsWith('TEMP_')) {
      console.log("✅ Video found in AI service outputs, verifying stability...");
      if (await waitForFileStability(aiServiceVideoPath)) {
        await fs.promises.copyFile(aiServiceVideoPath, backendVideoPath);
        const transcript = await getAndCacheTranscript();
        return res.json({
          status: "success",
          message: "Video generated successfully",
          videoUrl: `http://localhost:5000/videos/${videoFileName}`,
          transcript,
          topic,
          celebrity,
        });
      }
    }

    // 3. If not found, trigger generation
    if (pendingRequests.has(videoFileName)) {
      console.log(`⏳ Request for ${videoFileName} is already in progress. Polling instead of triggering...`);
    } else {
      pendingRequests.add(videoFileName);
      console.log(`🚀 Triggering new video generation for: ${videoFileName}`);
      const ai_service_url = `http://127.0.0.1:8000/generate`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const aiResponse = await fetch(ai_service_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ course, topic, celebrity }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!aiResponse.ok) {
          const errorData = await aiResponse.json().catch(() => ({}));
          throw new Error(errorData.detail || `AI service returned status ${aiResponse.status}`);
        }

        console.log("AI service accepted request or completed. Polling for results...");
      } catch (aiError) {
        if (aiError.name === 'AbortError') {
          console.warn("⚠️ AI Service request timed out, but proceeding to poll...");
        } else {
          pendingRequests.delete(videoFileName);
          console.error("❌ AI Service Error:", aiError.message);
          return res.status(500).json({
            error: "AI Service Unavailable",
            message: aiError.message
          });
        }
      }
    }

    // 4. Poll for the file
    const maxWaitTime = 120000; // 120 seconds
    const pollInterval = 3000; // Check every 3 seconds
    let elapsed = 0;

    while (elapsed < maxWaitTime) {
      if (fs.existsSync(aiServiceVideoPath)) {
        console.log("⏳ Video file detected, checking stability...");
        if (await waitForFileStability(aiServiceVideoPath)) {
          console.log("✅ Video generation complete and file verified!");
          await fs.promises.copyFile(aiServiceVideoPath, backendVideoPath);
          const transcript = await getAndCacheTranscript();

          pendingRequests.delete(videoFileName);
          return res.json({
            status: "success",
            message: "Video generated successfully",
            videoUrl: `http://localhost:5000/videos/${videoFileName}`,
            transcript,
            topic,
            celebrity,
          });
        }
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
      elapsed += pollInterval;
      if (elapsed % 15000 === 0) console.log(`Polling... ${elapsed / 1000}s elapsed`);
    }

    // 5. Cleanup and Timeout
    pendingRequests.delete(videoFileName);
    return res.status(408).json({
      error: "Video generation timeout",
      message: "Generation is taking longer than expected. The video will be available soon in your library.",
    });

  } catch (error) {
    pendingRequests.delete(videoFileName);
    console.error("🔥 Route Error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message
      });
    }
  }
});

// ✅ THIS LINE IS REQUIRED
export default router;
