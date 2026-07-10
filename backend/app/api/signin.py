"""每日签到接口"""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.core.coins import add_coins
from app.database import get_db
from app.models import DailySignin, User

router = APIRouter()

# 连续签到奖励表（1-7 天）
STREAK_REWARDS = [10, 15, 20, 25, 30, 40, 50]


def _reward_for_streak(streak: int) -> int:
    """按连续天数返回奖励金币数。>7 循环取 STREAK_REWARDS[6]"""
    idx = min(streak - 1, len(STREAK_REWARDS) - 1)
    return STREAK_REWARDS[idx]


@router.get("/status")
def signin_status(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """查询今日是否已签到、连续签到天数"""
    today = date.today()
    yesterday = today - timedelta(days=1)

    today_record = (
        db.query(DailySignin)
        .filter(DailySignin.user_id == user.id, DailySignin.signin_date == today)
        .first()
    )

    if today_record:
        streak = today_record.streak
        signed_today = True
    else:
        # 未签到，看昨天的连续天数
        yesterday_record = (
            db.query(DailySignin)
            .filter(DailySignin.user_id == user.id, DailySignin.signin_date == yesterday)
            .first()
        )
        streak = yesterday_record.streak if yesterday_record else 0
        signed_today = False

    # 未来 7 天的奖励预告
    upcoming = []
    for i in range(7):
        next_streak = streak + i + (0 if signed_today else 1)
        upcoming.append({
            "streak": next_streak,
            "reward": _reward_for_streak(next_streak),
            "is_today": i == 0 and not signed_today,
        })

    return {
        "signed_today": signed_today,
        "current_streak": streak,
        "coins": user.coins,
        "upcoming": upcoming,
    }


@router.post("")
def signin(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """执行签到"""
    today = date.today()
    yesterday = today - timedelta(days=1)

    existed = (
        db.query(DailySignin)
        .filter(DailySignin.user_id == user.id, DailySignin.signin_date == today)
        .first()
    )
    if existed:
        raise HTTPException(400, "今日已签到")

    yesterday_record = (
        db.query(DailySignin)
        .filter(DailySignin.user_id == user.id, DailySignin.signin_date == yesterday)
        .first()
    )
    streak = (yesterday_record.streak + 1) if yesterday_record else 1
    coins_gained = _reward_for_streak(streak)

    record = DailySignin(
        user_id=user.id,
        signin_date=today,
        coins_gained=coins_gained,
        streak=streak,
    )
    db.add(record)

    add_coins(
        db, user,
        amount=coins_gained,
        kind="signin",
        remark=f"连续签到{streak}天",
        commit=False,
    )
    db.commit()
    db.refresh(user)

    return {
        "ok": True,
        "coins_gained": coins_gained,
        "current_streak": streak,
        "coins": user.coins,
    }


@router.get("/history")
def signin_history(
    user: User = Depends(get_current_user),
    days: int = 30,
    db: Session = Depends(get_db),
):
    """近 N 天的签到记录"""
    since = date.today() - timedelta(days=days - 1)
    records = (
        db.query(DailySignin)
        .filter(DailySignin.user_id == user.id, DailySignin.signin_date >= since)
        .order_by(DailySignin.signin_date.desc())
        .all()
    )
    return {
        "items": [
            {
                "date": r.signin_date.isoformat(),
                "coins_gained": r.coins_gained,
                "streak": r.streak,
            }
            for r in records
        ],
    }
