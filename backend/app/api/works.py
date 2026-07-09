"""作品接口"""
import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_current_user_optional
from app.database import get_db
from app.models import User, Work

router = APIRouter()


class StatItem(BaseModel):
    code: str
    hex: str
    count: int


class PublishWorkRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=64)
    source_type: str  # "image" | "draw"
    grid_width: int = Field(..., ge=1, le=200)
    grid_height: int = Field(..., ge=1, le=200)
    grid_data: list[list[Optional[str]]]
    stats: list[StatItem]
    cover_base64: Optional[str] = None
    price: int = Field(0, ge=0)


def _work_to_dict(w: Work, author: Optional[User] = None, include_data: bool = False):
    d = {
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
    }
    if author:
        d["author"] = {
            "id": author.id,
            "nickname": author.nickname,
            "avatar_url": author.avatar_url,
        }
    if include_data:
        d["grid_data"] = json.loads(w.grid_data)
        d["stats"] = json.loads(w.stats)
    return d


@router.post("/publish")
def publish_work(
    req: PublishWorkRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """发布作品"""
    if req.source_type not in ("image", "draw"):
        raise HTTPException(400, "无效的作品类型")

    # 校验 grid_data 尺寸
    if len(req.grid_data) != req.grid_height:
        raise HTTPException(400, "grid_data 高度与 grid_height 不一致")
    if req.grid_data and len(req.grid_data[0]) != req.grid_width:
        raise HTTPException(400, "grid_data 宽度与 grid_width 不一致")

    total_beads = sum(s.count for s in req.stats)
    color_count = len(req.stats)

    work = Work(
        user_id=user.id,
        title=req.title.strip(),
        source_type=req.source_type,
        grid_width=req.grid_width,
        grid_height=req.grid_height,
        grid_data=json.dumps(req.grid_data),
        stats=json.dumps([s.dict() for s in req.stats]),
        total_beads=total_beads,
        color_count=color_count,
        cover_base64=req.cover_base64,
        price=req.price,
    )
    db.add(work)
    db.commit()
    db.refresh(work)
    return _work_to_dict(work, author=user)


@router.get("")
def list_works(
    sort: str = Query("newest", regex="^(newest|hot|likes)$"),
    price_type: str = Query("free", regex="^(free|paid|all)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """列表：支持排序和价格筛选"""
    q = db.query(Work).filter(Work.is_deleted == False)

    if price_type == "free":
        q = q.filter(Work.price == 0)
    elif price_type == "paid":
        q = q.filter(Work.price > 0)

    if sort == "newest":
        q = q.order_by(desc(Work.created_at))
    elif sort == "likes":
        q = q.order_by(desc(Work.likes_count), desc(Work.created_at))
    else:  # hot: 综合点赞、收藏、浏览
        # 简易热度算法：点赞*3 + 收藏*5 + 浏览*1
        # 用 Python 端排序更简单（不用 SQL 表达式）
        q = q.order_by(desc(Work.created_at))
        works = q.offset((page - 1) * limit).limit(limit * 2).all()
        works.sort(
            key=lambda w: w.likes_count * 3 + w.favorites_count * 5 + w.views_count,
            reverse=True,
        )
        works = works[:limit]
        author_map = _fetch_authors(db, works)
        return {
            "items": [_work_to_dict(w, author=author_map.get(w.user_id)) for w in works],
            "page": page,
            "has_more": len(works) == limit,
        }

    works = q.offset((page - 1) * limit).limit(limit).all()
    author_map = _fetch_authors(db, works)
    return {
        "items": [_work_to_dict(w, author=author_map.get(w.user_id)) for w in works],
        "page": page,
        "has_more": len(works) == limit,
    }


def _fetch_authors(db: Session, works: list) -> dict:
    user_ids = {w.user_id for w in works}
    if not user_ids:
        return {}
    authors = db.query(User).filter(User.id.in_(user_ids)).all()
    return {u.id: u for u in authors}


@router.get("/mine")
def list_my_works(
    user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """我的作品"""
    q = (
        db.query(Work)
        .filter(Work.user_id == user.id, Work.is_deleted == False)
        .order_by(desc(Work.created_at))
    )
    works = q.offset((page - 1) * limit).limit(limit).all()
    return {
        "items": [_work_to_dict(w, author=user) for w in works],
        "page": page,
        "has_more": len(works) == limit,
    }


@router.get("/{work_id}")
def get_work(
    work_id: int,
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """详情"""
    work = db.query(Work).filter(Work.id == work_id, Work.is_deleted == False).first()
    if not work:
        raise HTTPException(404, "作品不存在")

    author = db.query(User).filter(User.id == work.user_id).first()

    # 浏览量 +1（自己看自己的不加）
    if not user or user.id != work.user_id:
        work.views_count += 1
        db.commit()

    return _work_to_dict(work, author=author, include_data=True)


@router.delete("/{work_id}")
def delete_work(
    work_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """删除自己的作品（软删除）"""
    work = db.query(Work).filter(Work.id == work_id).first()
    if not work:
        raise HTTPException(404, "作品不存在")
    if work.user_id != user.id:
        raise HTTPException(403, "无权删除他人作品")
    work.is_deleted = True
    work.updated_at = datetime.utcnow()
    db.commit()
    return {"ok": True}
