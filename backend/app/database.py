"""数据库连接与 Session 管理"""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 本地默认用 SQLite（省事），生产环境用环境变量里的 PostgreSQL URL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./local.db")

# Render 给的 URL 是 postgres:// 开头，SQLAlchemy 要求 postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # 自动检测断连
    connect_args=(
        {"check_same_thread": False}
        if DATABASE_URL.startswith("sqlite")
        else {}
    ),
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI 依赖注入用：每个请求一个 Session，自动关闭"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
