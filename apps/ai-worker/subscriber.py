# apps/ai-worker/subscriber.py
import os
import json
import asyncio
from dotenv import load_dotenv
from google.cloud import pubsub_v1
from services.audio_processor import HapticGenerator

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")
SUBSCRIPTION_ID = os.getenv("PUB_SUB_SUBSCRIPTION_ID")
INPUT_BUCKET = os.getenv("GCS_INPUT_BUCKET")
OUTPUT_BUCKET = os.getenv("GCS_OUTPUT_BUCKET")

# Set credentials for the script
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

# --- Main Logic ---
haptic_generator = HapticGenerator()

def process_message(message: pubsub_v1.subscriber.message.Message) -> None:
    """Callback function to process a single Pub/Sub message."""
    try:
        # Decode the message data
        data = json.loads(message.data.decode("utf-8"))
        job_id = data.get("jobId")
        video_filename = data.get("videoFilename")

        if not job_id or not video_filename:
            print("Error: Invalid message format received.")
            message.nack() # Negatively acknowledge invalid messages
            return

        print(f"✅ Received job: {job_id}. Processing file: {video_filename}")

        # Run the asynchronous processing task
        asyncio.run(
            haptic_generator.process_gcs_video(
                job_id=job_id,
                input_bucket=INPUT_BUCKET,
                input_filename=video_filename,
                output_bucket=OUTPUT_BUCKET,
                output_formats=["json", "ahap"]
            )
        )

        print(f"✅ Finished processing job: {job_id}")
        message.ack() # Acknowledge the message so it's not redelivered

    except Exception as e:
        print(f"❌ Error processing job: {e}")
        message.nack() # Negatively acknowledge on failure

def main():
    """Starts the Pub/Sub subscriber."""
    subscriber = pubsub_v1.SubscriberClient()
    subscription_path = subscriber.subscription_path(GCP_PROJECT_ID, SUBSCRIPTION_ID)

    print(f"🎧 Listening for messages on {subscription_path}...")

    # The subscriber is non-blocking, so we must keep the main thread alive.
    streaming_pull_future = subscriber.subscribe(subscription_path, callback=process_message)

    try:
        # Wait for the subscriber to finish (which it won't, unless there's an error).
        streaming_pull_future.result()
    except KeyboardInterrupt:
        streaming_pull_future.cancel()
        print("Subscriber stopped.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        streaming_pull_future.cancel()

if __name__ == "__main__":
    main()