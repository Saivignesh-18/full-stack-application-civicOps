"""
CivicOps Chatbot Service
AI-powered chatbot for municipal operations assistance
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="CivicOps Chatbot",
    description="AI chatbot service for CivicOps municipal platform",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "chatbot"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "CivicOps Chatbot Service", "version": "1.0.0"}
