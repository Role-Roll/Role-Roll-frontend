import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Carousel3D from '../components/Carousel3D.jsx';
import '../style/home.css';

function useReveal() {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;

    const nodes = root.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    nodes.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return ref;
}

function Home() {
  const pageRef = useReveal();

  return (
    <div className="home-page" ref={pageRef}>
      <section className="hero">
        <div className="hero-content reveal">
          <p className="hero-eyebrow">Red Blood Cell Vision Detectect System</p>
          <h1>
            비전 모델 기반{' '}
            <span className="hero-accent">적혈구 이상</span> 탐지 및 분석 시스템
          </h1>
          <p className="hero-lead">
            현미경 적혈구 이미지를 업로드시, 탐지 모델이 적혈구 형태를 분류합니다.
          </p>
          <div className="hero-actions">
            <Link to="/analyze" className="btn btn-primary">
              탐지
            </Link>
            <a href="#how-it-works" className="btn btn-ghost">
              How to use
            </a>
          </div>
        </div>
        <div className="hero-visual reveal" style={{ transitionDelay: '0.15s' }}>
          <div className="hero-orbit" aria-hidden="true">
            <span className="orbit-cell orbit-a" />
            <span className="orbit-cell orbit-b" />
            <span className="orbit-cell orbit-c" />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="features">
        <h2 className="section-title reveal">How to use</h2>
        <div className="feature-grid">
          <article className="feature-card reveal">
            <span className="feature-num">01</span>
            <h3>이미지 업로드</h3>
            <p>
              분석할 혈액 세포 이미지를 업로드합니다.
              <br />
              업로드된 이미지는 모델 입력 형식에 맞게
              <br />
              자동으로 전처리됩니다.
            </p>
          </article>
          <article className="feature-card reveal" style={{ transitionDelay: '0.08s' }}>
            <span className="feature-num">02</span>
            <h3>모델 선택 및 분석 실행</h3>
            <p>
              YOLO 계열, DETR 계열, CNN 계열 중
              <br />
              원하는 모델을선택한 뒤 분석을 실행합니다.
              <br />
              동일 이미지에 대해 모델별 탐지 결과를 
              <br />
              비교할 수 있습니다.
            </p>
          </article>
          <article className="feature-card reveal" style={{ transitionDelay: '0.16s' }}>
            <span className="feature-num">03</span>
            <h3>결과 확인 및 해석</h3>
            <p>
              탐지된 세포 위치, 클래스, 신뢰도, 
              <br />
              성능 지표를 확인합니다.
              <br />
              결과는 색상별 bounding box와 
              <br />
              요약 리포트로 제공됩니다.
            </p>
          </article>
        </div>
      </section>

      <div className="reveal">
        <Carousel3D />
      </div>
    </div>
  );
}

export default Home;