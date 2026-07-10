"""意见反馈接口"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Feedback, User
from app.wechat import check_text_safe

router = APIRouter()


class FeedbackRequest(BaseModel):
    content: str = Field(..., min_length=5, max_length=500)
    contact: str | None = Field(None, max_length=128)


@router.post("")
async def submit_feedback(
    req: FeedbackRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ok, _ = await check_text_safe(req.content, user.openid, scene=4)
    if not ok:
        raise HTTPException(400, "反馈内容包含不合规文字，请修改")

    fb = Feedback(
        user_id=user.id,
        content=req.content.strip(),
        contact=(req.contact or "").strip() or None,
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return {"ok": True, "id": fb.id}
