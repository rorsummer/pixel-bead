"""每日配额与消费逻辑"""
from datetime import date, datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.coins import add_coins
from app.models import DailyUsage, User

# 图片转图纸配额规则
PIXELATE_FREE_PER_DAY = 5
PIXELATE_COST_AFTER_FREE = 5
PIXELATE_ACTION = "pixelate"


def _get_or_create_today_usage(db: Session, user_id: int, action: str) -> DailyUsage:
    today = date.today()
    row = (
        db.query(DailyUsage)
        .filter(
            DailyUsage.user_id == user_id,
            DailyUsage.action == action,
            DailyUsage.usage_date == today,
        )
        .first()
    )
    if not row:
        row = DailyUsage(
            user_id=user_id,
            action=action,
            usage_date=today,
            count=0,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def get_pixelate_quota(db: Session, user: User) -> dict:
    """查询当前用户的图片转图纸配额"""
    usage = _get_or_create_today_usage(db, user.id, PIXELATE_ACTION)
    remaining_free = max(0, PIXELATE_FREE_PER_DAY - usage.count)
    cost_next = 0 if remaining_free > 0 else PIXELATE_COST_AFTER_FREE
    return {
        "used_today": usage.count,
        "free_quota": PIXELATE_FREE_PER_DAY,
        "remaining_free": remaining_free,
        "cost_next": cost_next,
        "cost_after_free": PIXELATE_COST_AFTER_FREE,
        "coins": user.coins,
    }


def consume_pixelate(db: Session, user: User) -> dict:
    """执行一次消费。返回本次消费的详情"""
    usage = _get_or_create_today_usage(db, user.id, PIXELATE_ACTION)

    if usage.count < PIXELATE_FREE_PER_DAY:
        usage.count += 1
        usage.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        return {
            "paid": False,
            "amount": 0,
            "used_today": usage.count,
            "remaining_free": max(0, PIXELATE_FREE_PER_DAY - usage.count),
            "coins": user.coins,
        }

    if user.coins < PIXELATE_COST_AFTER_FREE:
        raise HTTPException(
            status_code=400,
            detail=f"金币不足！本次需要 {PIXELATE_COST_AFTER_FREE} 金币，请签到攒金币",
        )

    add_coins(
        db, user,
        amount=-PIXELATE_COST_AFTER_FREE,
        kind="pixelate_paid",
        remark="图片转图纸付费使用",
        commit=False,
    )
    usage.count += 1
    usage.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return {
        "paid": True,
        "amount": PIXELATE_COST_AFTER_FREE,
        "used_today": usage.count,
        "remaining_free": 0,
        "coins": user.coins,
    }
