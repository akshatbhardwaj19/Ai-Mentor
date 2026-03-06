import os
import datetime
import re
import traceback
import time
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
import pyttsx3

# ----------------------------
# Load API Key
# ----------------------------
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env file")

client = genai.Client(api_key=GEMINI_API_KEY)

# ----------------------------
# FastAPI App
# ----------------------------
app = FastAPI()

class VideoRequest(BaseModel):
    course: str
    topic: str
    celebrity: str

@app.get("/health")
def health_check():
    return {"status": "ok", "api_key_configured": bool(GEMINI_API_KEY)}

# ----------------------------
# Celebrity Video Selector
# ----------------------------
def get_celebrity_video(name: str):
    name = name.lower()
    if "modi" in name:
        return "input/modi.mp4"
    elif "salman" in name:
        return "input/salman.mp4"
    else:
        return "input/modi.mp4"

# ----------------------------
# Main API
# ----------------------------
@app.post("/generate")
def generate_video(data: VideoRequest):
    try:
        print(f"🚀 [AI SERVICE] STARTING: {data.topic} with {data.celebrity}")
        
        # 1️⃣ Generate Text
        prompt = f"""
Create a 50 word educational explanation about '{data.topic}' in the subject '{data.course}'.

Rules:
- 100% English only
- No Hindi
- No Hinglish
- Simple classroom teaching tone
- Between 45 and 60 words

Narration style inspired by {data.celebrity}.
"""

        print("--- [1/7] Generating text with Gemini...")
        try:
            # Using gemini-2.5-flash as it was previously recognized (returned 400 not 404)
            response = client.models.generate_content(
                model="gemini-2.5-flash", 
                contents=prompt
            )
            text = response.text.strip().replace("\n", " ")
        except Exception as api_err:
            print(f"🔥 Gemini API Error: {api_err}")
            raise HTTPException(status_code=502, detail=f"Gemini API Error: {str(api_err)}")

        print(f"--- Text generated: {text[:50]}...")

        # 2️⃣ Create Output Folder
        output_dir = os.path.join("outputs", "video")
        os.makedirs(output_dir, exist_ok=True)

        def clean_name(s):
            # Same logic as backend: replace any non-alphanumeric/underscore/hyphen with _
            return re.sub(r'[^\w-]', '_', s)

        topic_clean = clean_name(data.topic)
        course_clean = clean_name(data.course)
        celebrity_clean = clean_name(data.celebrity)
        
        base_name = f"{topic_clean}_{celebrity_clean}_{course_clean}"
        
        text_path = os.path.join(output_dir, f"{base_name}.txt")
        raw_audio = os.path.join(output_dir, f"{base_name}_raw.mp3")
        final_audio = os.path.join(output_dir, f"{base_name}.mp3")
        final_video = os.path.join(output_dir, f"{base_name}.mp4")

        # 3️⃣ Save Text
        with open(text_path, "w", encoding="utf-8") as f:
            f.write(text)

        # 4️⃣ Generate Normal Audio
        print("--- [4/7] Generating audio with pyttsx3...")
        local_engine = pyttsx3.init()
        local_engine.setProperty("rate", 150)
        
        if os.path.exists(raw_audio):
            try: os.remove(raw_audio)
            except: pass

        local_engine.save_to_file(text, raw_audio)
        local_engine.runAndWait()
        
        # Wait for file to become available
        max_retries = 20
        while not os.path.exists(raw_audio) and max_retries > 0:
            time.sleep(0.5)
            max_retries -= 1
        
        if not os.path.exists(raw_audio):
            raise Exception(f"Failed to generate raw audio file at {raw_audio}")

        # Stop locally initialized engine
        del local_engine
        print(f"--- Audio saved to {raw_audio}")

        # 5️⃣ Slow Down Audio (20% slower)
        print("--- [5/7] Slowing down audio...")
        slow_command = (
            f'ffmpeg -y -i "{raw_audio}" '
            f'-filter:a "atempo=0.8" '
            f'"{final_audio}"'
        )

        ret = os.system(slow_command)
        if ret != 0:
            raise Exception(f"FFmpeg slow command failed with code {ret}")

        if os.path.exists(raw_audio):
            try: os.remove(raw_audio)
            except: pass

        # 6️⃣ Select Video
        print("--- [6/7] Selecting background video...")
        input_video = get_celebrity_video(data.celebrity)

        if not os.path.exists(input_video):
            print(f"❌ ERROR: {input_video} not found")
            raise HTTPException(status_code=404, detail=f"Input video {input_video} not found")

        # 7️⃣ Merge Video + Slowed Audio
        print("--- [7/7] Merging video and audio...")
        ffmpeg_command = (
            f'ffmpeg -y -stream_loop -1 -i "{input_video}" '
            f'-i "{final_audio}" '
            f'-map 0:v:0 -map 1:a:0 '
            f'-c:v copy -c:a aac -shortest "{final_video}"'
        )

        ret = os.system(ffmpeg_command)
        if ret != 0:
            raise Exception(f"FFmpeg merge command failed with code {ret}")

        print(f"✅ [AI SERVICE] COMPLETE: {final_video}")
        return {
            "message": "Video generated successfully",
            "video_file": final_video
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"🔥 ERROR in generate_video: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
