import { useState, useEffect, useRef } from 'react';
import {
  MODEL_CATALOG,
  LABELS,
  TOTAL_FORMULA,
  getModelById,
  fetchArduinoStatus,
  predictImage,
} from '../api.js';
import '../style/blood.css';

function formatPercent(value) {
  if (value == null) return '—';
  return `${(Number(value) * 100).toFixed(1)}%`;
}

/** 백엔드 헤더 라벨명 → 색상 매핑 (LABELS 색과 동일 톤) */
const COUNT_COLORS = {
  'normal rbc': '#4ade80',
  'sickle cell': '#f87171',
  'white cell': '#a78bfa',
  wbc: '#a78bfa',
  platelets: '#fbbf24',
  platelet: '#fbbf24',
};

function colorForLabel(label) {
  return COUNT_COLORS[String(label).trim().toLowerCase()] ?? '#94a3b8';
}

function Blood() {
  const [modelId, setModelId] = useState(MODEL_CATALOG[0]?.id ?? 'yolov8');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [counts, setCounts] = useState(null);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const resultBlobRef = useRef(null);
  const [arduinoStatus, setArduinoStatus] = useState(null);
  const [autoArduinoRefresh] = useState(true);
  const lastArduinoKeyRef = useRef('');
  const autoDetectingRef = useRef(false);

  const model = getModelById(modelId);

  function makeArduinoKey(status) {
    const c = status?.control;
    if (!c) return '';
    return [c.threshold, c.nms, c.brightness, c.blur, c.mode].join('|');
  }

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (resultBlobRef.current) URL.revokeObjectURL(resultBlobRef.current);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!autoArduinoRefresh) return undefined;

    const intervalId = setInterval(async () => {
      try {
        const status = await fetchArduinoStatus();
        setArduinoStatus(status);

        const nextKey = makeArduinoKey(status);
        if (!nextKey) return;

        if (!lastArduinoKeyRef.current) {
          lastArduinoKeyRef.current = nextKey;
          return;
        }

        if (nextKey === lastArduinoKeyRef.current) {
          return;
        }

        lastArduinoKeyRef.current = nextKey;

        if (!file || !modelId || model?.family !== 'CNN') return;
        if (autoDetectingRef.current) return;

        autoDetectingRef.current = true;

        const { imageUrl, counts: detCounts, total: detTotal } = await predictImage(
          modelId,
          file
        );

        if (!imageUrl) return;

        setResultUrl((prev) => {
          if (prev?.startsWith('blob:')) {
            URL.revokeObjectURL(prev);
          }
          return imageUrl;
        });
        resultBlobRef.current = imageUrl.startsWith('blob:') ? imageUrl : null;
        setCounts(detCounts ?? null);
        setTotal(detTotal ?? null);
      } catch (err) {
        console.warn('[arduino auto refresh]', err);
      } finally {
        autoDetectingRef.current = false;
      }
    }, 1200);

    return () => clearInterval(intervalId);
  }, [autoArduinoRefresh, file, model?.family, modelId]);

  const handleFile = (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (!picked.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, etc.).');
      return;
    }
    setError(null);
    setFile(picked);
    setResultUrl(null);
    setCounts(null);
    setTotal(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(picked));
  };

  const handlePredict = async () => {
    if (!file) {
      setError('Please select an image first.');
      return;
    }
    setLoading(true);
    setError(null);

    if (resultBlobRef.current) {
      URL.revokeObjectURL(resultBlobRef.current);
      resultBlobRef.current = null;
    }

    try {
      const { imageUrl, counts: detCounts, total: detTotal } = await predictImage(
        modelId,
        file
      );
      if (!imageUrl) {
        throw new Error('No annotated image returned from server.');
      }
      if (imageUrl.startsWith('blob:')) resultBlobRef.current = imageUrl;
      setResultUrl(imageUrl);
      setCounts(detCounts ?? null);
      setTotal(detTotal ?? null);

      try {
        const status = await fetchArduinoStatus();
        setArduinoStatus(status);
        lastArduinoKeyRef.current = makeArduinoKey(status);
      } catch {
        setArduinoStatus(null);
      }
    } catch (err) {
      setError(
        err.message ||
          'Could not reach the API. Start FastAPI on port 8000 or check VITE_API_BASE_URL.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="blood-page">
      <header className="blood-header">
        <h1>Image Analysis</h1>
        <p>모델을 선택하고 적혈구 현미경 이미지를 업로드하세요.</p>
      </header>

      <div className="blood-layout">
        <aside className="blood-sidebar">
          <section className="panel">
            <h2>Model</h2>
            <label htmlFor="model-select" className="sr-only">
              Select detection model
            </label>
            <select
              id="model-select"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
            >
              {MODEL_CATALOG.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.family})
                </option>
              ))}
            </select>
          </section>

          {model && (
            <section className="panel metrics-panel">
              <h2>{model.name} Metrics</h2>
              <dl className="metrics-list">
                <div>
                  <dt>Precision</dt>
                  <dd>{formatPercent(model.precision)}</dd>
                </div>
                <div>
                  <dt>Recall</dt>
                  <dd>{formatPercent(model.recall)}</dd>
                </div>
                <div>
                  <dt>mAP50-95</dt>
                  <dd>{formatPercent(model.map5095)}</dd>
                </div>
                <div className="metric-total">
                  <dt>
                    Total
                    <span className="metric-info" tabIndex={0}>
                      <span className="metric-info-btn" aria-hidden="true">
                        ?
                      </span>
                      <span className="metric-tooltip" role="tooltip">
                        {TOTAL_FORMULA}
                      </span>
                    </span>
                  </dt>
                  <dd>{formatPercent(model.total)}</dd>
                </div>
              </dl>
              <div className="training-notes">
                <h3>모델 정보</h3>
                <p>{model.trainingNotes}</p>
              </div>
            </section>
          )}

          <section className="panel legend-panel">
            <h2>Labels</h2>
            <ul className="label-legend">
              {Object.entries(LABELS).map(([id, info]) => (
                <li key={id}>
                  <span className="legend-swatch" style={{ background: info.color }} />
                  <span>
                    {info.name}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        <div className="blood-main">
          <section className="panel upload-panel">
            <h2>Upload</h2>
            <div
              className={`dropzone ${file ? 'has-file' : ''}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) {
                  const input = document.getElementById('blood-file');
                  const dt = new DataTransfer();
                  dt.items.add(dropped);
                  input.files = dt.files;
                  handleFile({ target: input });
                }
              }}
            >
              <input
                id="blood-file"
                type="file"
                accept="image/*"
                onChange={handleFile}
                hidden
              />
              <label htmlFor="blood-file" className="dropzone-label">
                {file ? file.name : 'Click or drag image here'}
              </label>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-run"
              onClick={handlePredict}
              disabled={loading || !file}
            >
              {loading ? 'Detecting…' : 'Run Detection'}
            </button>
            {error && (
              <p className="blood-error" role="alert">
                {error}
              </p>
            )}
          </section>

          <div className="compare-row">
            <figure className="image-panel panel">
              <figcaption>Original</figcaption>
              {previewUrl ? (
                <img src={previewUrl} alt="Uploaded microscope slide" />
              ) : (
                <div className="image-placeholder">No image</div>
              )}
            </figure>
            <figure className="image-panel panel">
              <figcaption>Detection result</figcaption>
              {resultUrl ? (
                <img src={resultUrl} alt="Model detection output with bounding boxes" />
              ) : (
                <div className="image-placeholder">
                  {loading ? 'Processing…' : 'Result will appear here'}
                </div>
              )}
            </figure>
          </div>

          <section className="panel counts-panel">
            <div className="counts-header">
              <h2>Detections</h2>
              {counts && Object.keys(counts).length > 0 && (
                <span className="counts-total">Total: {total ?? '—'}</span>
              )}
            </div>
            {counts && Object.keys(counts).length > 0 ? (
              <ul className="counts-list">
                {Object.entries(counts).map(([label, n]) => (
                  <li key={label} className="count-item">
                    <span
                      className="count-swatch"
                      style={{ background: colorForLabel(label) }}
                    />
                    <span className="count-label">{label}</span>
                    <span className="count-value">{n}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="counts-placeholder">
                {loading ? '모델 추론 중…' : '모델을 돌려주세요.'}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default Blood;
