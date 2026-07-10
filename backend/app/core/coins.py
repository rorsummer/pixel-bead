"""金币系统核心：所有金币变动通过 add_coins 走"""
from typing import Optional

from sqlalchemy.orm import Session

from app.models import CoinTransaction, User


def add_coins(
    db: Session,
    user: User,
    amount: int,
    kind: str,
    ref_id: Optional[int] = None,
    remark: Optional[str] = None,
    commit: bool = True,
) -> CoinTransaction:
    """
    修改用户金币并记录流水。
    amount 正数=增加，负数=扣减。
    如果扣减后金币会小于 0，抛异常。
    """
    new_balance = user.coins + amount
    if new_balance < 0:
        raise ValueError("金币不足")

    user.coins = new_balance
    txn = CoinTransaction(
        user_id=user.id,
        kind=kind,
        amount=amount,
        balance=new_balance,
        ref_id=ref_id,
        remark=remark,
    )
    db.add(txn)
    if commit:
        db.commit()
        db.refresh(user)
        db.refresh(txn)
    return txn
