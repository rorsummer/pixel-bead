"""排行榜接口"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Like, User, Work

router = APIRouter()


def _work_to_card(w: Work, author: User | None, rank_likes: int | None = None):
    return {
        "id": w.id,
        "user_id": w.user_id,
        "title": w.title,
        "source_type": w.source_type,
        "grid_width": w.grid_width,
        "grid_height": w.grid_height,
        "total_beads": w.total_beads,
        "color_count": w.color_count,
        "cover_base64": w.cover_base64,
        "price": w.price,
        "likes_count": w.likes_count,
        "favorites_count": w.favorites_count,
        "views_count": w.views_count,
        "created_at": w.created_at.isoformat(),
        "rank_likes": rank_likes if rank_likes is not None else w.likes_count,
        "author": {
            "id": author.id,
            "nickname": author.nickname,
            "avatar_url": author.avatar_url,
        } if author else None,
    }


@router.get("/ranking")
def get_ranking(
    period: str = Query("day", regex="^(day|week|month)$"),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """按指定周期内的点赞数排行"""
    now = datetime.utcnow()
    if period == "day":
        since = now - timedelta(days=1)
    elif period == "week":
        since = now - timedelta(days=7)
    else:
        since = now - timedelta(days=30)

    # 统计每个作品在时间窗口内的点赞数
    q = (
        db.query(Work, func.count(Like.id).label("recent_likes"))
        .outerjoin(Like, (Like.work_id == Work.id) & (Like.created_at >= since))
        .filter(Work.is_deleted == False)
        .group_by(Work.id)
        .order_by(desc("recent_likes"), desc(Work.created_at))
        .limit(limit)
    )
    rows = q.all()

    # 过滤掉窗口内 0 点赞的（避免"排行榜"里全是 0 赞作品）
    rows = [r for r in rows if r[1] > 0]

    user_ids = {r[0].user_id for r in rows}
    authors = (
        {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()}
        if user_ids else {}
    )

    items = [
        _work_to_card(w, authors.get(w.user_id), rank_likes=int(likes))
        for w, likes in rows
    ]
    return {"period": period, "items": items}
