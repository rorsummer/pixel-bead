"""FastAPI 应用入口"""
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.feedback import router as feedback_router
from app.api.interactions import router as interactions_router
from app.api.pixelate import router as pixelate_router
from app.api.ranking import router as ranking_router
from app.api.user import router as user_router
from app.api.works import router as works_router
from app.database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="创豆纪 API",
    description="拼豆图纸生成器后端",
    version="0.7.0",

)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pixelate_router, prefix="/api", tags=["pixelate"])
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(user_router, prefix="/api/user", tags=["user"])
app.include_router(works_router, prefix="/api/works", tags=["works"])
app.include_router(interactions_router, prefix="/api", tags=["interactions"])
app.include_router(ranking_router, prefix="/api", tags=["ranking"])
app.include_router(feedback_router, prefix="/api/feedback", tags=["feedback"])


@app.get("/")
def root():
    return {"status": "ok", "service": "chuangdouji-api"}
