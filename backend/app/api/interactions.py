"""点赞、收藏接口"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Favorite, Like, User, Work

router = APIRouter()


def _get_work_or_404(db: Session, work_id: int) -> Work:
    work = db.query(Work).filter(Work.id == work_id, Work.is_deleted == False).first()
    if not work:
        raise HTTPException(404, "作品不存在")
    return work


def _work_to_card(w: Work, author: User | None = None) -> dict:
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
        "author": {
            "id": author.id,
            "nickname": author.nickname,
            "avatar_url": author.avatar_url,
        } if author else None,
    }


@router.post("/works/{work_id}/like")
def like_work(
    work_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    work = _get_work_or_404(db, work_id)
    existed = db.query(Like).filter(Like.user_id == user.id, Like.work_id == work_id).first()
    if existed:
        return {"liked": True, "likes_count": work.likes_count}
    try:
        like = Like(user_id=user.id, work_id=work_id)
        db.add(like)
        work.likes_count += 1
        db.commit()
    except IntegrityError:
        db.rollback()
    db.refresh(work)
    return {"liked": True, "likes_count": work.likes_count}


@router.delete("/works/{work_id}/like")
def unlike_work(
    work_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    work = _get_work_or_404(db, work_id)
    like = db.query(Like).filter(Like.user_id == user.id, Like.work_id == work_id).first()
    if like:
        db.delete(like)
        work.likes_count = max(0, work.likes_count - 1)
        db.commit()
        db.refresh(work)
    return {"liked": False, "likes_count": work.likes_count}


@router.post("/works/{work_id}/favorite")
def favorite_work(
    work_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    work = _get_work_or_404(db, work_id)
    existed = db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.work_id == work_id).first()
    if existed:
        return {"favorited": True, "favorites_count": work.favorites_count}
    try:
        fav = Favorite(user_id=user.id, work_id=work_id)
        db.add(fav)
        work.favorites_count += 1
        db.commit()
    except IntegrityError:
        db.rollback()
    db.refresh(work)
    return {"favorited": True, "favorites_count": work.favorites_count}


@router.delete("/works/{work_id}/favorite")
def unfavorite_work(
    work_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    work = _get_work_or_404(db, work_id)
    fav = db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.work_id == work_id).first()
    if fav:
        db.delete(fav)
        work.favorites_count = max(0, work.favorites_count - 1)
        db.commit()
        db.refresh(work)
    return {"favorited": False, "favorites_count": work.favorites_count}


@router.get("/me/likes")
def my_likes(
    user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """我点赞过的作品列表"""
    q = (
        db.query(Work, Like.created_at.label("liked_at"))
        .join(Like, Like.work_id == Work.id)
        .filter(Like.user_id == user.id, Work.is_deleted == False)
        .order_by(desc(Like.created_at))
    )
    rows = q.offset((page - 1) * limit).limit(limit).all()

    user_ids = {r[0].user_id for r in rows}
    authors = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}

    items = [_work_to_card(w, authors.get(w.user_id)) for w, _ in rows]
    return {"items": items, "page": page, "has_more": len(rows) == limit}


@router.get("/me/favorites")
def my_favorites(
    user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """我收藏的作品列表"""
    q = (
        db.query(Work, Favorite.created_at.label("fav_at"))
        .join(Favorite, Favorite.work_id == Work.id)
        .filter(Favorite.user_id == user.id, Work.is_deleted == False)
        .order_by(desc(Favorite.created_at))
    )
    rows = q.offset((page - 1) * limit).limit(limit).all()

    user_ids = {r[0].user_id for r in rows}
    authors = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}

    items = [_work_to_card(w, authors.get(w.user_id)) for w, _ in rows]
    return {"items": items, "page": page, "has_more": len(rows) == limit}
