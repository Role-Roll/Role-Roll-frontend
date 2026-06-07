/**
 * FastAPI 백엔드 연동
 * 개발: Vite proxy → /api → http://127.0.0.1:8000
 * 프로덕션: VITE_API_BASE_URL 환경 변수 사용
 */

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '/api';

/** Total 종합 점수 가중치: Precision*0.1 + Recall*0.1 + mAP50-95*0.8 */
export const TOTAL_WEIGHTS = { precision: 0.1, recall: 0.1, map5095: 0.8 };

export const TOTAL_FORMULA = 'Total = Precision*0.1 + Recall*0.1 + mAP50-95*0.8';

/** 모델 메트릭으로 Total 종합 점수 계산 */
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
    id: 'yolov5',
    name: 'YOLOv5s',
    family: 'YOLO',
    endpoint: '/yolo/v5/detect',
    precision: 0.914,
    recall: 0.929,
    map5095: 0.742,
    trainingNotes:
      'Mosaic·MixUp 증강, 300 epoch, AdamW, multi-scale training. Tri-class bbox detection.',
  },
  {
    id: 'yolov8',
    name: 'YOLOv8s',
    family: 'YOLO',
    endpoint: '/yolo/v8/detect',
    precision: 0.915,
    recall: 0.928,
    map5095: 0.764,
    trainingNotes:
      'Copy-Paste·HSV 증강, 250 epoch, SGD with cosine LR. C2f backbone, anchor-free head.',
  },
  {
    id: 'yolov11',
    name: 'YOLOv11s',
    family: 'YOLO',
    endpoint: '/yolo/v11/detect',
    precision: 0.891,
    recall: 0.936,
    map5095: 0.744,
    trainingNotes:
      'RandAugment, 200 epoch, label smoothing. Latest YOLO architecture with improved NMS.',
  },
  {
    id: 'rtdetr',
    name: 'RT-DETR',
    family: 'DETR',
    endpoint: '/detr/rt/detect',
    precision: 0.8712,
    recall: 0.8915,
    map5095: 0.8378,
    trainingNotes:
      'Mosaic, HSV, 좌우 반전, Scale Jitter, Random Erasing 기법으로 데이터증강',
  },
  {
    id: 'rfdetr',
    name: 'RF-DETR',
    family: 'DETR',
    endpoint: '/detr/rf/detect',
    precision: 0.901,
    recall: 0.889,
    map5095: 0.761,
    trainingNotes:
      'Mosaic, HSV, 좌우 반전, Scale Jitter, Random Erasing 기법으로 데이터증강',
  },
  {
  id: 'convnext',
  name: 'ConvNeXt-Tiny',
  family: 'CNN',
  endpoint: '/cnn/detect',
  defaultThreshold: 0.10,
  precision: 0.8815,
  recall: 0.9666,
  map5095: 0.7700,
  trainingNotes: 'Faster R-CNN with ConvNeXt-Tiny backbone.',
  },
  {
    id: 'efficientnet',
    name: 'EfficientNet-B0',
    family: 'CNN',
    endpoint: '/cnn/detect',
    defaultThreshold: 0.10,
    precision: 0.8352,
    recall: 0.9328,
    map5095: 0.6830,
    trainingNotes: 'Faster R-CNN with EfficientNet-B0 backbone.',
  },
  {
    id: 'mobilenet',
    name: 'MobileNetV3-Large',
    family: 'CNN',
    endpoint: '/cnn/detect',
    defaultThreshold: 0.10,
    precision: 0.8217,
    recall: 0.9479,
    map5095: 0.6990,
    trainingNotes: 'Faster R-CNN with MobileNetV3-Large backbone.',
  },
  {
    id: 'resnet50',
    name: 'ResNet50',
    family: 'CNN',
    endpoint: '/cnn/detect',
    defaultThreshold: 0.10,
    precision: 0.8548,
    recall: 0.9535,
    map5095: 0.7408,
    trainingNotes: 'Faster R-CNN with ResNet50-FPN backbone.',
  }
];

{/* 각 모델에 Total 종합 점수를 더해 노출 */}
export const MODEL_CATALOG = MODEL_CATALOG_BASE.map((m) => ({
  ...m,
  total: computeTotal(m),
}));

export const LABELS = {
  1: { name: '정상 적혈구', color: '#4ade80', short: '정상 적혈구' },
  2: { name: '낫 모양 적혈구', color: '#f87171', short: '낫 모양 적혈구' },
  3: { name: '백혈구', color: '#a78bfa', short: '백혈구' },
  4: { name: '혈소판', color: '#fbbf24', short: '혈소판' },
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

  if (total == null && counts && typeof counts === 'object') {
    total = Object.values(counts).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }

  return { counts, total };
}

export async function predictImage(modelId, imageFile) {
  const model = getModelById(modelId);
  if (!model) throw new Error('선택한 모델을 찾을 수 없습니다.');
  if (!imageFile) throw new Error('업로드된 이미지가 없습니다.');

  const formData = new FormData();

  formData.append('file', imageFile);
  // formData.append('image', imageFile);

  formData.append('model_id', modelId);
  formData.append('model', model.name);

  const path = model.endpoint;
  const threshold = model.defaultThreshold ?? 0.25;
  const nms = model.defaultNms ?? 0.50;

  formData.append('threshold', String(threshold));
  formData.append('nms', String(nms));
  // formData.append('model_key', model.backendKey ?? modelId);

  const params = new URLSearchParams();
  params.set('conf', String(threshold));
  params.set('nms', String(nms));
  params.set('use_arduino', '1');

  const url = `${API_BASE}${path}?${params.toString()}`;
  let res;
  try {
    console.info(
      `[predict] POST ${url} ` +
      `(model_id=${modelId}, threshold=${threshold}, file=${imageFile.name})`
    );

    res = await fetch(url, {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new Error('백엔드에 연결하지 못했습니다');
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
      const resultUrl =
        imageField.startsWith('data:') || imageField.startsWith('http')
          ? imageField
          : `${API_BASE}${imageField.startsWith('/') ? '' : '/'}${imageField}`;

      return {
        imageUrl: resultUrl,
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

{/* LLM 분석 */}
export async function analyzeWithLLM(modelId, resultImageUrl, detections) {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model_id: modelId,
      image_url: resultImageUrl,
      detections,
    }),
  });

  if (!res.ok) {
    throw new Error('LLM analysis endpoint not available');
  }

  const data = await res.json();
  return data.analysis ?? data.text ?? data.message ?? '';
}
