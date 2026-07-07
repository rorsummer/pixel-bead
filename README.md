# 拼豆图纸生成器

上传图片，自动生成 MARD 色卡拼豆图纸。

## 功能特性

- 图片像素化处理，自动匹配 MARD 221 色卡
- Floyd-Steinberg 抖动算法，模拟渐变效果
- 自动识别背景，避免误采样
- 分块图纸，方便按拼豆板尺寸打印
- SVG 矢量导出，高质量打印

## 技术栈

- 后端：Python + FastAPI + Pillow + NumPy
- 前端：React + TypeScript + Vite

## 本地运行

### 后端

    cd backend
    pip install -r requirements.txt
    uvicorn app.main:app --reload

### 前端

    cd frontend
    npm install
    npm run dev

访问 http://localhost:5173
