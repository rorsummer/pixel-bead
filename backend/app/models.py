"""数据表模型"""
from datetime import datetime

from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, Date, ForeignKey, Integer, String, Text,
    UniqueConstraint,
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
    __tablename__ = "works"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(64), nullable=False)
    source_type = Column(String(16), nullable=False)
    grid_width = Column(Integer, nullable=False)
    grid_height = Column(Integer, nullable=False)
    grid_data = Column(Text, nullable=False)
    stats = Column(Text, nullable=False)
    total_beads = Column(Integer, default=0, nullable=False)
    color_count = Column(Integer, default=0, nullable=False)
    cover_base64 = Column(Text, nullable=True)
    price = Column(Integer, default=0, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    likes_count = Column(Integer, default=0, nullable=False)
    favorites_count = Column(Integer, default=0, nullable=False)
    views_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Like(Base):
    __tablename__ = "likes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    work_id = Column(Integer, ForeignKey("works.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    __table_args__ = (UniqueConstraint("user_id", "work_id", name="uq_like_user_work"),)


class Favorite(Base):
    __tablename__ = "favorites"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    work_id = Column(Integer, ForeignKey("works.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    __table_args__ = (UniqueConstraint("user_id", "work_id", name="uq_fav_user_work"),)


class Feedback(Base):
    __tablename__ = "feedbacks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    contact = Column(String(128), nullable=True)
    status = Column(String(16), default="open", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class CoinTransaction(Base):
    __tablename__ = "coin_transactions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    kind = Column(String(32), nullable=False)
    amount = Column(Integer, nullable=False)
    balance = Column(BigInteger, nullable=False)
    ref_id = Column(Integer, nullable=True)
    remark = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class DailySignin(Base):
    __tablename__ = "daily_signins"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    signin_date = Column(Date, nullable=False, index=True)
    coins_gained = Column(Integer, nullable=False)
    streak = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    __table_args__ = (UniqueConstraint("user_id", "signin_date", name="uq_signin_user_date"),)


class DailyUsage(Base):
    """每日使用次数记录，用于配额（比如图片转图纸每日 5 次免费）"""
    __tablename__ = "daily_usages"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action = Column(String(32), nullable=False)  # 'pixelate' 等
    usage_date = Column(Date, nullable=False, index=True)
    count = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    __table_args__ = (
        UniqueConstraint("user_id", "action", "usage_date", name="uq_usage_user_action_date"),
    )

    
class DailyTaskProgress(Base):
    """每日任务进度：一个用户一天一个 task_key 一行"""
    __tablename__ = "daily_task_progress"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    task_key = Column(String(32), nullable=False)  # publish / like / favorite
    progress_date = Column(Date, nullable=False, index=True)
    progress = Column(Integer, default=0, nullable=False)
    claimed = Column(Boolean, default=False, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    __table_args__ = (
        UniqueConstraint("user_id", "task_key", "progress_date", name="uq_task_user_key_date"),
    )

    
class Purchase(Base):
    """购买记录"""
    __tablename__ = "purchases"
    id = Column(Integer, primary_key=True, index=True)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    work_id = Column(Integer, ForeignKey("works.id"), nullable=False, index=True)
    price = Column(Integer, nullable=False)  # 交易时的价格
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    __table_args__ = (
        UniqueConstraint("buyer_id", "work_id", name="uq_purchase_buyer_work"),
    )


