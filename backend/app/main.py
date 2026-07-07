"""
FastAPI 应用入口
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.pixelate import router as pixelate_router

app = FastAPI(
    title="拼豆像素化 API",
    description="上传图片生成 MARD 色卡拼豆图纸",
    version="0.1.0",
)

# 允许前端跨域访问（开发环境放开所有，生产环境记得改成具体域名）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pixelate_router, prefix="/api", tags=["pixelate"])


@app.get("/")
def root():
    return {"status": "ok", "service": "pixel-bead-api"}
