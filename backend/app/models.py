"""数据表模型"""
from datetime import datetime

from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, String, Text,
)

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    openid = Column(String(64), unique=True, index=True, nullable=False)
    unionid = Column(String(64), index=True, nullable=True)
    nickname = Column(String(64), nullable=True)
    avatar_url = Column(String(512), nullable=True)
    coins = Column(BigInteger, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Work(Base):
    """作品表：图纸元数据 + 每格色号 JSON"""
    __tablename__ = "works"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(64), nullable=False)
    source_type = Column(String(16), nullable=False)  # "image" | "draw"
    grid_width = Column(Integer, nullable=False)
    grid_height = Column(Integer, nullable=False)
    grid_data = Column(Text, nullable=False)  # JSON: 二维数组，元素为色号或 null
    stats = Column(Text, nullable=False)  # JSON: [{code, hex, count}]
    total_beads = Column(Integer, default=0, nullable=False)
    color_count = Column(Integer, default=0, nullable=False)
    cover_base64 = Column(Text, nullable=True)  # 封面预览图 base64
    price = Column(Integer, default=0, nullable=False)  # 0=广场免费, >0=小卖部售价
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    likes_count = Column(Integer, default=0, nullable=False)
    favorites_count = Column(Integer, default=0, nullable=False)
    views_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
