{/* API 기본 URL */}
const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '/api';

{/* Total 점수 가중치 */}
export const TOTAL_WEIGHTS = { precision: 0.1, recall: 0.1, map5095: 0.8 };

export const TOTAL_FORMULA = 'Total = Precision*0.1 + Recall*0.1 + mAP50-95*0.8';

{/* Total 점수 계산 */}
export function computeTotal(m) {
  if (!m) return null;
  return (
    (m.precision ?? 0) * TOTAL_WEIGHTS.precision +
    (m.recall ?? 0) * TOTAL_WEIGHTS.recall +
    (m.map5095 ?? 0) * TOTAL_WEIGHTS.map5095
  );
}

{/* 모델 정보 */}
const MODEL_CATALOG_BASE = [
  {
    id: 'yolov8',
    name: 'YOLOv8s',
    family: 'YOLO',
    endpoint: '/yolo/detect',
    precision: 0.915,
    recall: 0.928,
    map5095: 0.764,
    trainingNotes:
      '빠르고 안정적인 혈구 탐지 baseline 모델',
  },
  {
    id: 'yolov11',
    name: 'YOLOv11s',
    family: 'YOLO',
    endpoint: '/yolo/detect',
    precision: 0.891,
    recall: 0.936,
    map5095: 0.744,
    trainingNotes:
      '최신 경량 YOLO 모델',
  },
  {
    id: 'rtdetr',
    name: 'RT-DETR',
    family: 'DETR',
    endpoint: '/detr/detect',
    precision: 0.966981,
    recall: 0.178183,
    map5095: 0.709175,
    trainingNotes:
      'Transformer 기반 실시간 탐지, 복잡한 혈구 배치에 강점',
  },
  {
    id: 'rfdetr',
    name: 'RF-DETR',
    family: 'DETR',
    endpoint: '/detr/detect',
    precision: 0.938893,
    recall: 0.927490,
    map5095: 0.756285,
    trainingNotes:
      'DETR 계열 고성능 탐지, 작은 혈구 객체 위치 예측에 적합',
  },
  {
    id: 'convnext',
    name: 'ConvNeXt',
    family: 'CNN',
    endpoint: '/cnn/detect',
    precision: 0.8815,
    recall: 0.9666,
    map5095: 0.7700,
    trainingNotes:
      '최신 CNN 분류 모델, 혈구의 형태·질감 특징 학습',
  },
  {
    id: 'efficientnet',
    name: 'EfficientNet',
    family: 'CNN',
    endpoint: '/cnn/detect',
    precision: 0.8352,
    recall: 0.9328,
    map5095: 0.6830,
    trainingNotes:
      '정확도와 연산 효율의 균형이 좋은 경량 분류 모델.',
  },
  {
    id: 'mobilenet',
    name: 'MobileNet',
    family: 'CNN',
    endpoint: '/cnn/detect',
    precision: 0.8217,
    recall: 0.9479,
    map5095: 0.6990,
    trainingNotes:
      '모바일/웹 실시간 분류에 적합한 초경량 모델',
  },
  {
    id: 'resnet50',
    name: 'ResNet50',
    family: 'CNN',
    endpoint: '/cnn/detect',
    precision: 0.8548,
    recall: 0.9535,
    map5095: 0.7408,
    trainingNotes:
      '안정적인 CNN 분류 baseline, 혈구 형태 특징 학습에 강점',
  },
];

{/* 각 모델에 Total 종합 점수를 더해 노출 */}
export const MODEL_CATALOG = MODEL_CATALOG_BASE.map((m) => ({
  ...m,
  total: computeTotal(m),
}));

export const LABELS = {
  0: { name: '정상 적혈구', color: '#4ade80', short: '정상 적혈구' },
  1: { name: '낫 모양 적혈구', color: '#f87171', short: '낫 모양 적혈구' },
  2: { name: '백혈구', color: '#a78bfa', short: '백혈구' },
  3: { name: '혈소판', color: '#fbbf24', short: '혈소판' },
};

{/* 모델 ID로 모델 정보 조회 */}
export function getModelById(modelId) {

  return MODEL_CATALOG.find((m) => m.id === modelId) ?? null;
}

/** GET /models — 백엔드에서 목록을 주면 catalog 병합 */
export async function fetchModels() {
  try {
    const res = await fetch(`${API_BASE}/models`);
    if (!res.ok) return MODEL_CATALOG;
    const data = await res.json();
    return Array.isArray(data) ? data : data.models ?? MODEL_CATALOG;
  } catch {
    return MODEL_CATALOG;
  }
}

{/* 응답 헤더(X-Detection-Counts / X-Detection-Total)에서 라벨별 탐지 수를 파싱 */}
function parseDetectionHeaders(res) {
  let counts = null;
  let total = null;

  const countsHeader = res.headers.get('x-detection-counts');
  if (countsHeader) {
    try {
      counts = JSON.parse(countsHeader);
    } catch {
      counts = null;
    }
  }

  const totalHeader = res.headers.get('x-detection-total');
  if (totalHeader != null && totalHeader !== '') {
    const n = Number(totalHeader);
    total = Number.isNaN(n) ? null : n;
  }

  // total 헤더가 없으면 counts 합으로 보정
  if (total == null && counts && typeof counts === 'object') {
    total = Object.values(counts).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }

  return { counts, total };
}

{/* 이미지 탐지 요청 */}
export async function predictImage(modelId, imageFile) {
  const model = getModelById(modelId);
  if (!model) throw new Error('선택한 모델을 찾을 수 없습니다.');
  if (!imageFile) throw new Error('업로드된 이미지가 없습니다.');
  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('image', imageFile);
  formData.append('model_id', modelId);
  formData.append('model', model.name);

  const path = model.endpoint;
  const params = new URLSearchParams();
  params.set('conf', String(model.defaultThreshold ?? 0.25));
  params.set('nms', String(model.defaultNms ?? 0.5));

  if (model.family === 'CNN') {
    params.set('use_arduino', '1');
  }

  const url = `${API_BASE}${path}?${params.toString()}`;

  let res;
  try {
    console.info(`[predict] POST ${url} (model=${modelId}, file=${imageFile.name})`);
    res = await fetch(url, {
      method: 'POST',
      body: formData,
    });
  } catch (networkErr) {
    throw new Error(
      `백엔드에 연결하지 못했습니다`
    );
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `예측 요청 실패 (HTTP ${res.status})`);
  }

  const contentType = res.headers.get('content-type') || '';
  const { counts, total } = parseDetectionHeaders(res);

  if (contentType.includes('application/json')) {
    const json = await res.json();
    const imageField =
      json.annotated_image ??
      json.result_image ??
      json.image ??
      json.output_url;
    if (typeof imageField === 'string') {
      const url = imageField.startsWith('data:') || imageField.startsWith('http')
        ? imageField
        : `${API_BASE}${imageField.startsWith('/') ? '' : '/'}${imageField}`;
      return {
        imageUrl: url,
        detections: json.detections ?? json.boxes,
        counts: counts ?? json.counts ?? null,
        total: total ?? json.total ?? null,
        raw: json,
      };
    }
    if (json.image_base64) {
      return {
        imageUrl: `data:image/png;base64,${json.image_base64}`,
        detections: json.detections ?? json.boxes,
        counts: counts ?? json.counts ?? null,
        total: total ?? json.total ?? null,
        raw: json,
      };
    }
    return {
      imageUrl: null,
      detections: json.detections,
      counts: counts ?? json.counts ?? null,
      total: total ?? json.total ?? null,
      raw: json,
    };
  }

  const blob = await res.blob();
  return {
    imageUrl: URL.createObjectURL(blob),
    detections: null,
    counts,
    total,
    raw: null,
  };
}

export async function fetchArduinoStatus() {
  const res = await fetch(`${API_BASE}/arduino/status`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Arduino status 요청 실패');
  }

  return await res.json();
}
