import '../style/footer.css';

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p className="footer-brand">HemoVision AI</p>
        <p className="footer-desc">
        비전 모델 기반 적혈구 이상 탐지 및 분석 시스템 · YOLO · DETR · CNN
        </p>
        <p className="footer-copy">
          © {new Date().getFullYear()} Role-Roll. Tensor-Programming
        </p>
      </div>
    </footer>
  );
}

export default Footer;