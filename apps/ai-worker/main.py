# apps/ai-worker/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import uuid

from services.audio_processor import HapticGenerator

app = FastAPI(
    title="Haptic Studio - AI Worker",
    description="Processes video files to generate haptic feedback patterns.",
    version="1.0.0"
)

haptic_generator = HapticGenerator()

class GCSProcessRequest(BaseModel):
    input_bucket: str
    input_filename: str
    output_bucket: str
    output_formats: List[str] = ["json", "ahap"]

@app.get("/")
async def root():
    return {"status": "ok", "service": "ai-worker"}

@app.post("/test-gcs-process")
async def test_gcs_process(request: GCSProcessRequest):
    """
    An endpoint for manually testing the GCS download/upload flow.
    """
    job_id = str(uuid.uuid4())
    try:
        result = await haptic_generator.process_gcs_video(
            job_id=job_id,
            input_bucket=request.input_bucket,
            input_filename=request.input_filename,
            output_bucket=request.output_bucket,
            output_formats=request.output_formats
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))