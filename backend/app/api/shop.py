"""小卖部：购买、我的售出、我的购买"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.core.coins import add_coins
from app.database import get_db
from app.models import Purchase, User, Work

router = APIRouter()


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


@router.post("/works/{work_id}/purchase")
def purchase_work(
    work_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    work = db.query(Work).filter(Work.id == work_id, Work.is_deleted == False).first()
    if not work:
        raise HTTPException(404, "作品不存在")
    if work.price <= 0:
        raise HTTPException(400, "此作品是免费的，无需购买")
    if work.user_id == user.id:
        raise HTTPException(400, "不能购买自己的作品")

    existed = (
        db.query(Purchase)
        .filter(Purchase.buyer_id == user.id, Purchase.work_id == work_id)
        .first()
    )
    if existed:
        return {"ok": True, "already_purchased": True, "coins": user.coins}

    if user.coins < work.price:
        raise HTTPException(400, f"金币不足！需要 {work.price} 金币，当前只有 {user.coins}")

    seller = db.query(User).filter(User.id == work.user_id).first()
    if not seller:
        raise HTTPException(404, "卖家不存在")

    # 交易：买家扣金币 → 卖家加金币 → 记录
    try:
        add_coins(
            db, user,
            amount=-work.price,
            kind="purchase",
            ref_id=work.id,
            remark=f"购买作品 {work.title}",
            commit=False,
        )
        add_coins(
            db, seller,
            amount=work.price,
            kind="sale",
            ref_id=work.id,
            remark=f"售出作品 {work.title}",
            commit=False,
        )
        purchase = Purchase(
            buyer_id=user.id,
            seller_id=seller.id,
            work_id=work.id,
            price=work.price,
        )
        db.add(purchase)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "购买失败，请重试")
    except ValueError as e:
        db.rollback()
        raise HTTPException(400, str(e))

    return {
        "ok": True,
        "already_purchased": False,
        "coins": user.coins,
        "price": work.price,
    }


@router.get("/me/purchases")
def list_my_purchases(
    user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """我买过的作品"""
    q = (
        db.query(Work, Purchase.created_at.label("bought_at"))
        .join(Purchase, Purchase.work_id == Work.id)
        .filter(Purchase.buyer_id == user.id, Work.is_deleted == False)
        .order_by(desc(Purchase.created_at))
    )
    rows = q.offset((page - 1) * limit).limit(limit).all()

    user_ids = {r[0].user_id for r in rows}
    authors = (
        {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()}
        if user_ids else {}
    )
    items = [_work_to_card(w, authors.get(w.user_id)) for w, _ in rows]
    return {"items": items, "page": page, "has_more": len(rows) == limit}


@router.get("/me/sales")
def list_my_sales(
    user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """我卖出过的记录"""
    q = (
        db.query(Purchase)
        .filter(Purchase.seller_id == user.id)
        .order_by(desc(Purchase.created_at))
    )
    rows = q.offset((page - 1) * limit).limit(limit).all()

    work_ids = {r.work_id for r in rows}
    buyer_ids = {r.buyer_id for r in rows}
    works = {w.id: w for w in db.query(Work).filter(Work.id.in_(work_ids)).all()} if work_ids else {}
    buyers = {u.id: u for u in db.query(User).filter(User.id.in_(buyer_ids)).all()} if buyer_ids else {}

    items = []
    for p in rows:
        w = works.get(p.work_id)
        b = buyers.get(p.buyer_id)
        if not w:
            continue
        items.append({
            "id": p.id,
            "work_id": p.work_id,
            "work_title": w.title,
            "work_cover_base64": w.cover_base64,
            "price": p.price,
            "buyer": {
                "id": b.id if b else 0,
                "nickname": b.nickname if b else "已注销",
                "avatar_url": b.avatar_url if b else None,
            },
            "created_at": p.created_at.isoformat(),
        })
    return {"items": items, "page": page, "has_more": len(rows) == limit}
