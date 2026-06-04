import { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import '../style/carousel.css';
import normalIcon from '../assets/normal.jpeg';
import sickleIcon from '../assets/sickle.jpeg';
import wbcIcon from '../assets/whitecell.jpeg';
import plateletIcon from '../assets/platelets.jpeg';

const SLIDES = [
  {
    id: 0,
    label: '정상 적혈구',
    tag: '01',
    color: '#4ade80',
    icon: normalIcon,
    description:
      '정상 적혈구는 양쪽이 오목한 원반형입니다. 산소 운반에 최적화된 형태이며, 현미경에서 균일한 크기와 형태를 보입니다.',
  },
  {
    id: 1,
    label: '낫 모양 적혈구',
    tag: '02',
    color: '#f87171',
    icon: sickleIcon,
    description:
      '헤모글로빈 S로 인해 적혈구가 낫 모양으로 변형됩니다. 혈관 막힘과 조직 손상의 원인이 됩니다.',
  },
  {
    id: 2,
    label: '백혈구',
    tag: '03',
    color: '#a78bfa',
    icon: wbcIcon,
    description:
      '백혈구는 면역 반응을 담당하는 세포로, 적혈구보다 크고 핵을 가집니다. 감염이나 염증 상태를 파악하는 데 중요한 지표입니다.',
  },
  {
    id: 3,
    label: '혈소판',
    tag: '04',
    color: '#fbbf24',
    icon: plateletIcon,
    description:
      '혈소판은 혈액 응고에 관여하는 작은 세포 조각입니다. 적혈구나 백혈구에 비해 크기가 작으며, 출혈을 멈추는 역할을 합니다.',
  },
];

function Carousel3D() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'center' });
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return undefined;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i) => emblaApi && emblaApi.scrollTo(i), [emblaApi]);

  return (
    <section className="carousel-section" aria-label="혈액 세포 유형 소개">
      <h2 className="section-title">혈액 세포 형태 분류</h2>
      <p className="section-sub">네 가지 혈액 세포로 탐지합니다.</p>

      <div className="carousel" ref={emblaRef}>
        <div className="carousel-container">
          {SLIDES.map((slide, index) => (
            <div className="carousel-slide" key={slide.id}>
              <article
                className={`carousel-card ${index === selected ? 'is-active' : ''}`}
                style={{ '--accent': slide.color }}
              >
                <div className="card-face">
                  <span className="card-tag">{slide.tag}</span>
                  <img src={slide.icon} alt="" className="card-icon" />
                  <h3>{slide.label}</h3>
                  <p>{slide.description}</p>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>

      <div className="carousel-controls">
        <button type="button" onClick={scrollPrev} aria-label="Previous slide">
          ‹
        </button>
        <div className="carousel-dots" role="tablist">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={i === selected}
              aria-label={slide.label}
              className={i === selected ? 'active' : ''}
              onClick={() => scrollTo(i)}
            />
          ))}
        </div>
        <button type="button" onClick={scrollNext} aria-label="Next slide">
          ›
        </button>
      </div>
    </section>
  );
}

export default Carousel3D;
