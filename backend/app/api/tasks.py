"""每日任务接口"""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.core.coins import add_coins
from app.core.tasks import TASK_DEFS, get_task_def
from app.database import get_db
from app.models import DailyTaskProgress, User

router = APIRouter()


@router.get("/status")
def tasks_status(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """查询今日所有任务进度"""
    today = date.today()
    rows = (
        db.query(DailyTaskProgress)
        .filter(
            DailyTaskProgress.user_id == user.id,
            DailyTaskProgress.progress_date == today,
        )
        .all()
    )
    row_map = {r.task_key: r for r in rows}

    items = []
    for t in TASK_DEFS:
        row = row_map.get(t.key)
        progress = row.progress if row else 0
        claimed = row.claimed if row else False
        completed = progress >= t.target
        items.append({
            "key": t.key,
            "title": t.title,
            "desc": t.desc,
            "target": t.target,
            "reward": t.reward,
            "progress": min(progress, t.target),
            "completed": completed,
            "claimed": claimed,
            "claimable": completed and not claimed,
        })
    return {"items": items, "coins": user.coins}


@router.post("/claim/{task_key}")
def claim_task(
    task_key: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """领取任务奖励"""
    t = get_task_def(task_key)
    if not t:
        raise HTTPException(404, "任务不存在")

    today = date.today()
    row = (
        db.query(DailyTaskProgress)
        .filter(
            DailyTaskProgress.user_id == user.id,
            DailyTaskProgress.task_key == task_key,
            DailyTaskProgress.progress_date == today,
        )
        .first()
    )
    if not row or row.progress < t.target:
        raise HTTPException(400, "任务未完成")
    if row.claimed:
        raise HTTPException(400, "已领取过")

    add_coins(
        db, user,
        amount=t.reward,
        kind="task",
        remark=f"每日任务：{t.title}",
        commit=False,
    )
    row.claimed = True
    db.commit()
    db.refresh(user)

    return {
        "ok": True,
        "reward": t.reward,
        "coins": user.coins,
    }
