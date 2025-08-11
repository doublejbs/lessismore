import { FC, useEffect, useState } from 'react';

interface Props {
  isActive: boolean;
  onComplete: () => void;
}

const SVGFireworks: FC<Props> = ({ isActive, onComplete }) => {
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; delay: number }>
  >([]);

  useEffect(() => {
    if (isActive) {
      // 폭죽 파티클 생성 (더 많은 폭죽)
      const newParticles = [];
      for (let i = 0; i < 15; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 80 + 10, // 10-90% 범위
          y: Math.random() * 70 + 15, // 15-85% 범위
          delay: i * 0.2, // 더 빠른 간격으로 터지도록
        });
      }
      setParticles(newParticles);

      // 8초 후 완료 (더 긴 시간)
      const timer = setTimeout(() => {
        setParticles([]);
        onComplete();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  if (!isActive) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      <svg width='100%' height='100%' style={{ position: 'absolute' }}>
        {particles.map((particle) => (
          <g key={particle.id}>
            {/* 중심 폭발 */}
            <circle
              cx={`${particle.x}%`}
              cy={`${particle.y}%`}
              r='0'
              fill={
                ['#ffd700', '#ff4444', '#44ff44', '#4488ff', '#ff6600', '#ff44aa', '#ffffff'][
                  particle.id % 7
                ]
              }
              opacity='0.9'
            >
              <animate
                attributeName='r'
                values='0;35;0'
                dur='1.5s'
                begin={`${particle.delay}s`}
                repeatCount='1'
              />
              <animate
                attributeName='opacity'
                values='0.9;0.6;0'
                dur='1.5s'
                begin={`${particle.delay}s`}
                repeatCount='1'
              />
            </circle>

            {/* 방사형 파티클들 */}
            {Array.from({ length: 18 }).map((_, i) => {
              const angle = i * 20 * (Math.PI / 180);
              const distance = 80;
              const endX = particle.x + Math.cos(angle) * distance;
              const endY = particle.y + Math.sin(angle) * distance;

              return (
                <circle
                  key={i}
                  cx={`${particle.x}%`}
                  cy={`${particle.y}%`}
                  r='4'
                  fill={
                    ['#ffd700', '#ff4444', '#44ff44', '#4488ff', '#ff6600', '#ff44aa', '#ffffff'][
                      particle.id % 7
                    ]
                  }
                  opacity='0'
                >
                  <animate
                    attributeName='cx'
                    values={`${particle.x}%;${endX}%`}
                    dur='1.2s'
                    begin={`${particle.delay + 0.1}s`}
                    repeatCount='1'
                  />
                  <animate
                    attributeName='cy'
                    values={`${particle.y}%;${endY}%`}
                    dur='1.2s'
                    begin={`${particle.delay + 0.1}s`}
                    repeatCount='1'
                  />
                  <animate
                    attributeName='opacity'
                    values='0;1;0.8;0'
                    dur='1.2s'
                    begin={`${particle.delay + 0.1}s`}
                    repeatCount='1'
                  />
                  <animate
                    attributeName='r'
                    values='4;6;3;0'
                    dur='1.2s'
                    begin={`${particle.delay + 0.1}s`}
                    repeatCount='1'
                  />
                </circle>
              );
            })}

            {/* 별 모양 파티클 */}
            {Array.from({ length: 10 }).map((_, i) => {
              const angle = i * 36 * (Math.PI / 180);
              const distance = 100;
              const endX = particle.x + Math.cos(angle) * distance;
              const endY = particle.y + Math.sin(angle) * distance;

              return (
                <polygon
                  key={`star-${i}`}
                  points='0,-8 2.4,-2.4 8,0 2.4,2.4 0,8 -2.4,2.4 -8,0 -2.4,-2.4'
                  fill={
                    ['#ffd700', '#ff4444', '#44ff44', '#4488ff', '#ff6600', '#ff44aa', '#ffffff'][
                      particle.id % 7
                    ]
                  }
                  opacity='0'
                  transform={`translate(${particle.x}%, ${particle.y}%)`}
                >
                  <animateTransform
                    attributeName='transform'
                    type='translate'
                    values={`${particle.x}% ${particle.y}%;${endX}% ${endY}%`}
                    dur='1.5s'
                    begin={`${particle.delay + 0.05}s`}
                    repeatCount='1'
                  />
                  <animate
                    attributeName='opacity'
                    values='0;1;0.9;0'
                    dur='1.5s'
                    begin={`${particle.delay + 0.05}s`}
                    repeatCount='1'
                  />
                  <animateTransform
                    attributeName='transform'
                    type='rotate'
                    values='0;360'
                    dur='1.5s'
                    begin={`${particle.delay + 0.05}s`}
                    repeatCount='1'
                    additive='sum'
                  />
                </polygon>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
};

export default SVGFireworks;
