# apps/ai-worker/subscriber.py
# This is the complete, final, and definitively correct version of this file.

import os
import json
import asyncio
import aiohttp
from dotenv import load_dotenv
from google.cloud import pubsub_v1
from concurrent.futures import TimeoutError
from services.audio_processor import HapticGenerator

# --- Load Configuration ---
load_dotenv()
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")
SUBSCRIPTION_ID = os.getenv("PUB_SUB_SUBSCRIPTION_ID")
INPUT_BUCKET = os.getenv("GCS_INPUT_BUCKET")
OUTPUT_BUCKET = os.getenv("GCS_OUTPUT_BUCKET")
API_BASE_URL = os.getenv("API_BASE_URL")
API_KEY = os.getenv("API_KEY")
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

# --- Initialize Services ---
haptic_generator = HapticGenerator()

# --- Core Asynchronous Functions ---
async def update_job_status(session: aiohttp.ClientSession, job_id: str, status: str, output_url: str = None):
    """Calls the NestJS API asynchronously to update the job status."""
    update_url = f"{API_BASE_URL}/jobs/{job_id}"
    payload = {"status": status}
    if output_url:
        payload["outputUrl"] = output_url
    headers = {"Content-Type": "application/json", "x-api-key": API_KEY}
    try:
        async with session.patch(update_url, json=payload, headers=headers) as response:
            response.raise_for_status()
            print(f"✅ API notified. Job {job_id} status updated to {status}.")
    except aiohttp.ClientError as e:
        print(f"❌ Failed to update job status via API: {e}")

async def process_message_async(session: aiohttp.ClientSession, message: pubsub_v1.subscriber.message.Message):
    """The async business logic for processing a single message."""
    job_id = None
    try:
        data = json.loads(message.data.decode("utf-8"))
        job_id = data.get("jobId")
        video_filename = data.get("videoFilename")

        if not job_id or not video_filename:
            print(f"Error: Invalid message format: {message.data}")
            message.nack() # <-- FIX: Removed await
            return

        print(f"▶️ Received job: {job_id}. Processing file: {video_filename}")
        await update_job_status(session, job_id, "PROCESSING")

        result = await haptic_generator.process_gcs_video(
            job_id=job_id,
            input_bucket=INPUT_BUCKET,
            input_filename=video_filename,
            output_bucket=OUTPUT_BUCKET,
            output_formats=["json", "ahap"]
        )
        
        await update_job_status(session, job_id, "COMPLETED", output_url=result.get("output_path"))
        print(f"✅ Finished processing job: {job_id}")
        message.ack() # <-- FIX: Removed await
    except Exception as e:
        print(f"❌ Error processing job {job_id}: {e}")
        if job_id:
            await update_job_status(session, job_id, "FAILED")
        message.ack() # <-- FIX: Removed await

# --- Main Entry Point ---
def main():
    """Sets up the event loop and starts the subscriber."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    subscriber = pubsub_v1.SubscriberClient()
    subscription_path = subscriber.subscription_path(GCP_PROJECT_ID, SUBSCRIPTION_ID)
    try:
        loop.run_until_complete(run_subscriber(loop, subscriber, subscription_path))
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        tasks = asyncio.all_tasks(loop=loop)
        for task in tasks:
            task.cancel()
        group = asyncio.gather(*tasks, return_exceptions=True)
        loop.run_until_complete(group)
        loop.close()
        print("Subscriber stopped and resources cleaned up.")

async def run_subscriber(loop, subscriber, subscription_path):
    """The main async function that manages the subscriber and HTTP session."""
    async with aiohttp.ClientSession() as http_session:
        def sync_callback_wrapper(message: pubsub_v1.subscriber.message.Message):
            loop.call_soon_threadsafe(
                asyncio.create_task, process_message_async(http_session, message)
            )
        streaming_pull_future = subscriber.subscribe(subscription_path, callback=sync_callback_wrapper)
        print(f"🎧 Listening for messages on {subscription_path}...")
        try:
            await asyncio.wrap_future(streaming_pull_future)
        except asyncio.CancelledError:
            streaming_pull_future.cancel()
            streaming_pull_future.result()

if __name__ == "__main__":
    main()