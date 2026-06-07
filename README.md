# Role-Roll Frontend

혈구(적혈구·백혈구·혈소판) 현미경 이미지를 딥러닝 모델로 탐지·분류하는 웹 UI입니다.
모델을 선택하고 이미지를 업로드한 뒤 추론을 실행하면, 결과 이미지와 라벨별 탐지 개수를 보여줍니다.

React + Vite로 작성되었으며, FastAPI 백엔드와 연동됩니다.

## 기술 스택

- **React 18** + **React Router 6**
- **Vite 5** (개발 서버 / 번들러)
- **embla-carousel-react** (홈 화면 3D 캐러셀)

## 시작하기

### 요구 사항

- Node.js 18 이상
- 추론을 실제로 실행하려면 FastAPI 백엔드가 `http://127.0.0.1:8000`에서 동작 중이어야 합니다.

### 설치 및 실행

```bash
npm install
npm run dev
```

개발 서버는 기본적으로 `http://localhost:5173`에서 실행됩니다.

### 빌드 / 프리뷰

```bash
npm run build     # dist/ 로 프로덕션 빌드
npm run preview   # 빌드 결과 미리보기
```

## 백엔드 연동

API 요청은 `src/api.js`에서 처리합니다.

- **개발**: `vite.config.js`의 프록시가 `/api` 요청을 `http://127.0.0.1:8000`으로 전달하며, `/api` prefix는 제거됩니다.
  - 예: `/api/yolo/detect` → `http://127.0.0.1:8000/yolo/detect`
- **프로덕션**: 환경 변수 `VITE_API_BASE_URL`을 사용합니다. (미설정 시 `/api`)

```bash
# .env (프로덕션 빌드 시)
VITE_API_BASE_URL=https://your-backend.example.com
```

### 주요 엔드포인트

| 함수 | 메서드 | 경로 | 설명 |
|------|--------|------|------|
| `predictImage(modelId, file)` | `POST` | 모델별 `endpoint` | 이미지 추론 요청 |
| `fetchModels()` | `GET` | `/models` | 백엔드 모델 목록(선택) |

#### 추론 요청 (`predictImage`)

`multipart/form-data`로 전송합니다.

| 필드 | 값 |
|------|-----|
| `file` / `image` | 업로드 이미지 |
| `model_id` | 모델 ID (예: `yolov8`) |
| `model` | 모델 이름 |

#### 추론 응답

이미지(`image/jpeg` 등) 또는 JSON으로 받을 수 있으며, 라벨별 탐지 개수는 다음 응답 헤더에서 읽습니다.

| 헤더 | 예시 |
|------|------|
| `X-Detection-Counts` | `{"Normal RBC": 15, "Sickle Cell": 1}` |
| `X-Detection-Total` | `16` |

## 모델 카탈로그

모델 메트릭과 엔드포인트는 `src/api.js`의 `MODEL_CATALOG_BASE`에 정의되어 있습니다.

| 모델 | 계열 | 엔드포인트 |
|------|------|-----------|
| YOLOv8s | YOLO | `/yolo/detect` |
| YOLOv11s | YOLO | `/yolo/detect` |
| RT-DETR | DETR | `/detr/rt/detect` |
| RF-DETR | DETR | `/detr/rf/detect` |
| ConvNeXt | CNN | `/cnn/detect` |
| EfficientNet | CNN | `/cnn/detect` |
| MobileNet | CNN | `/cnn/detect` |
| ResNet50 | CNN | `/cnn/detect` |

각 모델에는 종합 점수가 함께 노출됩니다.

```
Total = Precision*0.1 + Recall*0.1 + mAP50-95*0.8
```

## 라벨

| ID | 클래스 | 색상 |
|----|--------|------|
| 0 | 정상 적혈구 | `#4ade80` |
| 1 | 낫 모양 적혈구 | `#f87171` |
| 2 | 백혈구 | `#a78bfa` |
| 3 | 혈소판 | `#fbbf24` |

## 페이지 / 라우트

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/` | `pages/Home.jsx` | 소개 / 랜딩 페이지 |
| `/analyze` | `pages/Blood.jsx` | 모델 선택·이미지 업로드·추론 결과 화면 |

## 프로젝트 구조

```
src/
├── api.js              # 백엔드 연동, 모델 카탈로그, 라벨 정의
├── App.jsx             # 라우팅
├── main.jsx            # 엔트리
├── components/
│   ├── Header.jsx
│   ├── Footer.jsx
│   └── Carousel3D.jsx
├── pages/
│   ├── Home.jsx
│   └── Blood.jsx       # 추론 UI (모델 선택 → 업로드 → 실행 → 결과/카운트)
└── style/              # 페이지·컴포넌트별 CSS
```
