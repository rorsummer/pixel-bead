"""微信登录接口"""
import os
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import create_access_token
from app.database import get_db
from app.models import User

router = APIRouter()

WECHAT_APPID = os.getenv("WECHAT_APPID", "")
WECHAT_SECRET = os.getenv("WECHAT_SECRET", "")


class WechatLoginRequest(BaseModel):
    code: str
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None


@router.post("/wechat-login")
async def wechat_login(req: WechatLoginRequest, db: Session = Depends(get_db)):
    if not WECHAT_APPID or not WECHAT_SECRET:
        raise HTTPException(500, "服务器未配置微信登录密钥")

    # 用小程序的 code 换取 openid
    url = "https://api.weixin.qq.com/sns/jscode2session"
    params = {
        "appid": WECHAT_APPID,
        "secret": WECHAT_SECRET,
        "js_code": req.code,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url, params=params)
        data = resp.json()

    if "openid" not in data:
        raise HTTPException(
            400, f"微信登录失败：{data.get('errmsg', '未知错误')} (code {data.get('errcode')})"
        )

    openid = data["openid"]
    unionid = data.get("unionid")

    # 找用户或创建新用户
    user = db.query(User).filter(User.openid == openid).first()
    if user is None:
        user = User(
            openid=openid,
            unionid=unionid,
            nickname=req.nickname or f"豆友{openid[-6:]}",
            avatar_url=req.avatar_url,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # 老用户更新最近登录时间和可选的头像/昵称
        user.last_login_at = datetime.utcnow()
        if req.nickname:
            user.nickname = req.nickname
        if req.avatar_url:
            user.avatar_url = req.avatar_url
        db.commit()
        db.refresh(user)

    token = create_access_token(user.id)
    return {
        "token": token,
        "user": {
            "id": user.id,
            "nickname": user.nickname,
            "avatar_url": user.avatar_url,
            "coins": user.coins,
        },
    }
