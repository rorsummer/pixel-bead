"""微信开放接口封装（access_token 缓存 + 内容审核）"""
import os
import time
from typing import Optional

import httpx

WECHAT_APPID = os.getenv("WECHAT_APPID", "")
WECHAT_SECRET = os.getenv("WECHAT_SECRET", "")

# access_token 缓存（进程内）
_token_cache = {"token": None, "expire_at": 0}


async def get_access_token() -> Optional[str]:
    """获取小程序 access_token（有效期 2 小时，我们缓存 1.5 小时）"""
    now = time.time()
    if _token_cache["token"] and _token_cache["expire_at"] > now:
        return _token_cache["token"]

    if not WECHAT_APPID or not WECHAT_SECRET:
        return None

    url = "https://api.weixin.qq.com/cgi-bin/token"
    params = {
        "grant_type": "client_credential",
        "appid": WECHAT_APPID,
        "secret": WECHAT_SECRET,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params)
            data = resp.json()
        if "access_token" in data:
            _token_cache["token"] = data["access_token"]
            _token_cache["expire_at"] = now + 5400  # 1.5 小时
            return data["access_token"]
    except Exception:
        pass
    return None


async def check_text_safe(text: str, openid: str, scene: int = 2) -> tuple[bool, str]:
    """
    检查文字是否违规。
    scene: 1 = 资料 / 2 = 评论 / 3 = 论坛 / 4 = 社交日志
    返回 (是否安全, 说明)
    """
    if not text or not text.strip():
        return True, ""

    token = await get_access_token()
    if not token:
        # 没配微信凭证或获取失败时，宽松放行（避免影响开发）
        return True, "跳过审核"

    url = f"https://api.weixin.qq.com/wxa/msg_sec_check?access_token={token}"
    payload = {
        "openid": openid,
        "scene": scene,
        "version": 2,
        "content": text,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload)
            data = resp.json()
    except Exception as e:
        return True, f"审核异常（放行）：{e}"

    # errcode = 0 且 result.suggest = pass 才是安全的
    if data.get("errcode") != 0:
        return True, f"审核接口错误（放行）：{data.get('errmsg')}"
    result = data.get("result", {})
    suggest = result.get("suggest")
    label = result.get("label")
    if suggest == "pass":
        return True, "pass"
    if suggest == "review":
        # review 表示需要人工，我们暂时放行（后续可加人工审核后台）
        return True, f"需要人工审核（放行）label={label}"
    return False, f"内容不合规 label={label}"
