# Main FastAPI application entry point
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Data Catalog API",
    description="A scalable data catalog with lineage visualization",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Data Catalog API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
