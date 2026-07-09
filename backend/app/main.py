"""FastAPI 应用入口"""
from dotenv import load_dotenv

# 先加载环境变量，再导入其他模块
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.pixelate import router as pixelate_router
from app.api.user import router as user_router
from app.database import Base, engine

# 启动时自动创建缺失的表（不会覆盖已有表）
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="创豆纪 API",
    description="拼豆图纸生成器后端",
    version="0.2.0",
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


@app.get("/")
def root():
    return {"status": "ok", "service": "chuangdouji-api"}
