"""数据表模型"""
from datetime import datetime

from sqlalchemy import BigInteger, Column, DateTime, Integer, String

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
