"""金币流水查询"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import CoinTransaction, User

router = APIRouter()


@router.get("/transactions")
def list_transactions(
    user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = (
        db.query(CoinTransaction)
        .filter(CoinTransaction.user_id == user.id)
        .order_by(desc(CoinTransaction.created_at))
    )
    total = q.count()
    items = q.offset((page - 1) * limit).limit(limit).all()
    return {
        "coins": user.coins,
        "items": [
            {
                "id": t.id,
                "kind": t.kind,
                "amount": t.amount,
                "balance": t.balance,
                "remark": t.remark,
                "created_at": t.created_at.isoformat(),
            }
            for t in items
        ],
        "total": total,
        "page": page,
        "has_more": (page * limit) < total,
    }
