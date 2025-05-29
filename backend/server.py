from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from enum import Enum
import aiohttp
import json


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Clerk configuration
CLERK_SECRET_KEY = os.environ.get('CLERK_SECRET_KEY')


# Models
class UserRole(str, Enum):
    NEW_USER = "new_user"
    MODERATOR = "moderator"
    SEED_USER = "seed_user"

class PostStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class ContentTag(str, Enum):
    HUMAN2HUMAN = "Human2Human"
    INNERWORLD = "InnerWorld"
    WITSPARK = "WitSpark"
    DEEPTHOUGHT = "DeepThought"
    HEARTLED = "HeartLed"
    CULTURALSOUL = "CulturalSoul"
    ADAPTFLOW = "AdaptFlow"

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    clerk_id: str
    email: str
    role: UserRole = UserRole.NEW_USER
    posts_today: int = 0
    last_post_date: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Post(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    content: str
    tag: ContentTag
    status: PostStatus = PostStatus.PENDING
    resonates: int = 0
    cherishes: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reviewed_at: Optional[datetime] = None
    reviewer_id: Optional[str] = None

class PostCreate(BaseModel):
    content: str
    tag: ContentTag

class PostUpdate(BaseModel):
    status: PostStatus
    reviewer_id: str

class UserCreate(BaseModel):
    email: str
    invite_code: Optional[str] = None


# Helper functions
async def verify_clerk_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify Clerk JWT token"""
    try:
        # For now, we'll implement a simplified verification
        # In production, you'd verify the JWT signature with Clerk's public key
        token = credentials.credentials
        
        # Decode token (simplified - in production use proper JWT verification)
        import base64
        import json
        try:
            # Simple token validation - in production use proper Clerk verification
            payload_part = token.split('.')[1]
            # Add padding if needed
            payload_part += '=' * (-len(payload_part) % 4)
            decoded = base64.urlsafe_b64decode(payload_part)
            payload = json.loads(decoded)
            return payload
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token")
            
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(payload: dict = Depends(verify_clerk_token)):
    """Get current user from token"""
    clerk_id = payload.get('sub')
    if not clerk_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"clerk_id": clerk_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(**user)

async def require_moderator(user: User = Depends(get_current_user)):
    """Require moderator or seed user role"""
    if user.role not in [UserRole.MODERATOR, UserRole.SEED_USER]:
        raise HTTPException(status_code=403, detail="Moderator access required")
    return user

async def check_daily_limit(user: User):
    """Check if user has exceeded daily post limit"""
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    
    if user.last_post_date != today:
        # Reset count for new day
        await db.users.update_one(
            {"id": user.id},
            {"$set": {"posts_today": 0, "last_post_date": today}}
        )
        user.posts_today = 0
        user.last_post_date = today
    
    if user.posts_today >= 3:
        raise HTTPException(status_code=429, detail="Daily post limit reached (3 posts per day)")


# Routes
@api_router.get("/")
async def root():
    return {"message": "Not by AI.space API"}

@api_router.post("/auth/register")
async def register_user(user_data: UserCreate):
    """Register a new user or moderator"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        return {"message": "User already exists"}
    
    # Determine role based on invite code
    role = UserRole.NEW_USER
    if user_data.invite_code == "aieventuallylose":
        role = UserRole.MODERATOR
    
    # This would typically be called after Clerk registration
    # For now, we'll create a placeholder
    user = User(
        clerk_id=str(uuid.uuid4()),  # In real implementation, this comes from Clerk
        email=user_data.email,
        role=role
    )
    
    await db.users.insert_one(user.dict())
    return {"message": "User registered successfully", "role": role.value}

@api_router.post("/auth/sync")
async def sync_user(payload: dict = Depends(verify_clerk_token)):
    """Sync user data from Clerk"""
    clerk_id = payload.get('sub')
    email = payload.get('email')
    
    if not clerk_id or not email:
        raise HTTPException(status_code=400, detail="Invalid token payload")
    
    # Check if user exists
    user = await db.users.find_one({"clerk_id": clerk_id})
    
    if not user:
        # Create new user
        new_user = User(
            clerk_id=clerk_id,
            email=email,
            role=UserRole.NEW_USER
        )
        await db.users.insert_one(new_user.dict())
        return {"message": "User created", "user": new_user.dict()}
    
    return {"message": "User exists", "user": User(**user).dict()}

@api_router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current user info"""
    return user

@api_router.post("/posts")
async def create_post(
    post_data: PostCreate,
    user: User = Depends(get_current_user)
):
    """Create a new post"""
    await check_daily_limit(user)
    
    post = Post(
        user_id=user.id,
        content=post_data.content,
        tag=post_data.tag
    )
    
    await db.posts.insert_one(post.dict())
    
    # Update user's daily post count
    await db.users.update_one(
        {"id": user.id},
        {"$inc": {"posts_today": 1}}
    )
    
    return {"message": "Post created successfully", "post_id": post.id}

@api_router.get("/posts/pending")
async def get_pending_posts(moderator: User = Depends(require_moderator)):
    """Get all pending posts for moderation"""
    posts = await db.posts.find({"status": PostStatus.PENDING}).sort("created_at", 1).to_list(100)
    
    # Get user info for each post
    for post in posts:
        user = await db.users.find_one({"id": post["user_id"]})
        post["user_email"] = user["email"] if user else "Unknown"
    
    return [Post(**post) for post in posts]

@api_router.put("/posts/{post_id}/review")
async def review_post(
    post_id: str,
    review_data: PostUpdate,
    moderator: User = Depends(require_moderator)
):
    """Approve or reject a post"""
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post["status"] != PostStatus.PENDING:
        raise HTTPException(status_code=400, detail="Post already reviewed")
    
    await db.posts.update_one(
        {"id": post_id},
        {
            "$set": {
                "status": review_data.status,
                "reviewed_at": datetime.now(timezone.utc),
                "reviewer_id": moderator.id
            }
        }
    )
    
    return {"message": f"Post {review_data.status.value}"}

@api_router.get("/posts/approved")
async def get_approved_posts(moderator: User = Depends(require_moderator)):
    """Get approved posts for feed curation"""
    posts = await db.posts.find({"status": PostStatus.APPROVED}).sort("created_at", -1).to_list(100)
    return [Post(**post) for post in posts]

@api_router.get("/feed")
async def get_daily_feed(user: User = Depends(get_current_user)):
    """Get today's curated feed (max 3 posts)"""
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    
    # For now, get 3 most recent approved posts
    # In production, moderators would curate these specifically
    posts = await db.posts.find({
        "status": PostStatus.APPROVED
    }).sort("created_at", -1).limit(3).to_list(3)
    
    # Get user info for each post
    for post in posts:
        user_info = await db.users.find_one({"id": post["user_id"]})
        post["user_email"] = user_info["email"] if user_info else "Anonymous"
    
    return [Post(**post) for post in posts]

@api_router.post("/posts/{post_id}/resonate")
async def resonate_post(post_id: str, user: User = Depends(get_current_user)):
    """Resonate with a post"""
    await db.posts.update_one(
        {"id": post_id},
        {"$inc": {"resonates": 1}}
    )
    return {"message": "Resonated with post"}

@api_router.post("/posts/{post_id}/cherish")
async def cherish_post(post_id: str, user: User = Depends(get_current_user)):
    """Cherish a post"""
    await db.posts.update_one(
        {"id": post_id},
        {"$inc": {"cherishes": 1}}
    )
    return {"message": "Cherished post"}

@api_router.get("/stats")
async def get_stats(moderator: User = Depends(require_moderator)):
    """Get platform statistics"""
    pending_count = await db.posts.count_documents({"status": PostStatus.PENDING})
    approved_count = await db.posts.count_documents({"status": PostStatus.APPROVED})
    total_users = await db.users.count_documents({})
    
    return {
        "pending_posts": pending_count,
        "approved_posts": approved_count,
        "total_users": total_users
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
