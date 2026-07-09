"""用户信息接口"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User

router = APIRouter()


class UpdateProfileRequest(BaseModel):
    nickname: str | None = None
    avatar_url: str | None = None


@router.get("/me")
def get_me(user: User = Depends(get_current_user)):
    """获取当前登录用户信息"""
    return {
        "id": user.id,
        "nickname": user.nickname,
        "avatar_url": user.avatar_url,
        "coins": user.coins,
    }


@router.post("/update-profile")
def update_profile(
    req: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """更新用户昵称/头像"""
    if req.nickname is not None:
        user.nickname = req.nickname
    if req.avatar_url is not None:
        user.avatar_url = req.avatar_url
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "nickname": user.nickname,
        "avatar_url": user.avatar_url,
        "coins": user.coins,
    }
