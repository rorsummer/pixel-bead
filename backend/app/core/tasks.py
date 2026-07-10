"""每日任务定义和进度更新"""
from dataclasses import dataclass
from datetime import date, datetime
from typing import List

from sqlalchemy.orm import Session

from app.models import DailyTaskProgress


@dataclass
class TaskDef:
    key: str
    title: str
    desc: str
    target: int
    reward: int


TASK_DEFS: List[TaskDef] = [
    TaskDef(
        key="publish",
        title="发布作品",
        desc="发布 1 个作品到广场",
        target=1,
        reward=20,
    ),
    TaskDef(
        key="like",
        title="点赞作品",
        desc="给他人作品点赞 3 次",
        target=3,
        reward=5,
    ),
    TaskDef(
        key="favorite",
        title="收藏作品",
        desc="收藏 1 个作品",
        target=1,
        reward=3,
    ),
]


def get_task_def(key: str) -> TaskDef | None:
    for t in TASK_DEFS:
        if t.key == key:
            return t
    return None


def bump_progress(db: Session, user_id: int, task_key: str, delta: int = 1):
    """增加进度。不达标不发奖励，达标后需用户主动领取"""
    if get_task_def(task_key) is None:
        return
    today = date.today()
    row = (
        db.query(DailyTaskProgress)
        .filter(
            DailyTaskProgress.user_id == user_id,
            DailyTaskProgress.task_key == task_key,
            DailyTaskProgress.progress_date == today,
        )
        .first()
    )
    if row is None:
        row = DailyTaskProgress(
            user_id=user_id,
            task_key=task_key,
            progress_date=today,
            progress=max(0, delta),
        )
        db.add(row)
    else:
        row.progress = max(0, row.progress + delta)
        row.updated_at = datetime.utcnow()
    db.commit()
