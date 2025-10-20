import asyncio
from fastapi import FastAPI
from contextlib import asynccontextmanager

# Import the main async function from the subscriber script
# This is now a relative import, which works because
# our new Dockerfile will set the WORKDIR to /app/apps/ai-worker
from subscriber import main as run_subscriber_main

# This context manager will run on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- On Startup ---
    print("🚀 FastAPI server is starting up...")
    
    # Start the Pub/Sub subscriber logic in a background task
    # This runs the 'main()' async function from subscriber.py
    print("🎧 Launching Pub/Sub subscriber task in the background...")
    asyncio.create_task(run_subscriber_main())
    print("✅ Subscriber task launched.")
    
    yield
    
    # --- On Shutdown ---
    print("Gracefully shutting down...")
    # (Cleanup logic can go here if needed in the future)

# Initialize the FastAPI app with the lifespan event handler
app = FastAPI(
    title="Haptic Studio - AI Worker",
    description="Processes haptic jobs and listens to Pub/Sub.",
    version="1.0.0",
    lifespan=lifespan
)

@app.get("/")
async def root():
    """
    Health check endpoint. Cloud Run will ping this to ensure
    the service is alive and listening on its port.
    """
    return {"status": "ok", "service": "ai-worker"}