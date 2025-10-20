import os
import json
import asyncio
import aiohttp
from dotenv import load_dotenv
from google.cloud import pubsub_v1
from concurrent.futures import TimeoutError
from services.audio_processor import HapticGenerator

# --- Universal Configuration Loader ---
# This block makes the app work BOTH locally and in Cloud Run.

# Check if we are running in a Cloud Run environment
# 'K_SERVICE' is an env var automatically set by Cloud Run.
IS_IN_PRODUCTION = os.getenv('K_SERVICE')

if not IS_IN_PRODUCTION:
    # We are running locally. Load .env file.
    print("Running in LOCAL mode. Loading .env file...")
    load_dotenv()
    
    # We also need to explicitly point to our local key file
    key_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if key_path:
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = key_path
        print(f"Local key file set: {key_path}")
    else:
        print("WARNING: GOOGLE_APPLICATION_CREDENTIALS not set in .env")
else:
    print("Running in PRODUCTION (Cloud Run) mode. Using attached service account.")
# --- End of Configuration Loader ---


# --- Load Configuration from Environment ---
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")
SUBSCRIPTION_ID = os.getenv("PUB_SUB_SUBSCRIPTION_ID")
INPUT_BUCKET = os.getenv("GCS_INPUT_BUCKET")
OUTPUT_BUCKET = os.getenv("GCS_OUTPUT_BUCKET")
API_BASE_URL = os.getenv("API_BASE_URL")
API_KEY = os.getenv("API_KEY")

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
            message.nack()
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
        message.ack()
    except Exception as e:
        print(f"❌ Error processing job {job_id}: {e}")
        if job_id:
            await update_job_status(session, job_id, "FAILED")
        message.ack()

# --- Main Entry Point ---
async def main():
    """Sets up the event loop and starts the subscriber."""
    print("Subscriber task started. Attempting to create Pub/Sub client...")
    
    try:
        # This will now use the attached Service Account in prod,
        # or the local key file in local dev.
        subscriber = pubsub_v1.SubscriberClient()
        subscription_path = subscriber.subscription_path(GCP_PROJECT_ID, SUBSCRIPTION_ID)
        print(f"✅ Pub/Sub client created. Listening on {subscription_path}")
    
    except Exception as e:
        print("==========================================================")
        print("      🔥 CRITICAL SUBSCRIBER FAILURE 🔥")
        print(f"Failed to initialize pubsub_v1.SubscriberClient().")
        print(f"ERROR TYPE: {type(e)}")
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        print("==========================================================")
        return
    
    loop = asyncio.get_event_loop()

    async with aiohttp.ClientSession() as http_session:
        def sync_callback_wrapper(message: pubsub_v1.subscriber.message.Message):
            loop.call_soon_threadsafe(
                asyncio.create_task, process_message_async(http_session, message)
            )
        
        streaming_pull_future = subscriber.subscribe(subscription_path, callback=sync_callback_wrapper)
        print(f"🎧 Now streaming messages from {subscription_path}...")
        
        try:
            await asyncio.wrap_future(streaming_pull_future)
        except asyncio.CancelledError:
            print("Subscriber pull future was cancelled.")
            streaming_pull_future.cancel()
            streaming_pull_future.result()
        except Exception as e:
            print(f"An error occurred in the subscriber pull: {e}")
            streaming_pull_future.cancel()
        finally:
            print("Subscriber shutting down.")
            
if __name__ == "__main__":
    # This block is now primarily for local testing,
    # as the 'main' function will be called by the FastAPI app.
    print("Running subscriber directly (local test mode)...")
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutting down locally...")