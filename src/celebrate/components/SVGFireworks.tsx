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
      // 폭죽 파티클 생성
      const newParticles = [];
      for (let i = 0; i < 5; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 80 + 10, // 10-90% 범위
          y: Math.random() * 60 + 20, // 20-80% 범위
          delay: i * 0.5, // 순차적으로 터지도록
        });
      }
      setParticles(newParticles);

      // 3초 후 완료
      const timer = setTimeout(() => {
        setParticles([]);
        onComplete();
      }, 3000);

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
            <circle cx={`${particle.x}%`} cy={`${particle.y}%`} r='0' fill='#ff6b6b' opacity='0.8'>
              <animate
                attributeName='r'
                values='0;20;0'
                dur='1s'
                begin={`${particle.delay}s`}
                repeatCount='1'
              />
              <animate
                attributeName='opacity'
                values='0.8;0.4;0'
                dur='1s'
                begin={`${particle.delay}s`}
                repeatCount='1'
              />
            </circle>

            {/* 방사형 파티클들 */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = i * 30 * (Math.PI / 180);
              const distance = 40;
              const endX = particle.x + Math.cos(angle) * distance;
              const endY = particle.y + Math.sin(angle) * distance;

              return (
                <circle
                  key={i}
                  cx={`${particle.x}%`}
                  cy={`${particle.y}%`}
                  r='2'
                  fill={['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'][i % 5]}
                  opacity='0'
                >
                  <animate
                    attributeName='cx'
                    values={`${particle.x}%;${endX}%`}
                    dur='1.5s'
                    begin={`${particle.delay + 0.2}s`}
                    repeatCount='1'
                  />
                  <animate
                    attributeName='cy'
                    values={`${particle.y}%;${endY}%`}
                    dur='1.5s'
                    begin={`${particle.delay + 0.2}s`}
                    repeatCount='1'
                  />
                  <animate
                    attributeName='opacity'
                    values='0;1;0'
                    dur='1.5s'
                    begin={`${particle.delay + 0.2}s`}
                    repeatCount='1'
                  />
                  <animate
                    attributeName='r'
                    values='2;1;0'
                    dur='1.5s'
                    begin={`${particle.delay + 0.2}s`}
                    repeatCount='1'
                  />
                </circle>
              );
            })}

            {/* 별 모양 파티클 */}
            {Array.from({ length: 6 }).map((_, i) => {
              const angle = i * 60 * (Math.PI / 180);
              const distance = 60;
              const endX = particle.x + Math.cos(angle) * distance;
              const endY = particle.y + Math.sin(angle) * distance;

              return (
                <polygon
                  key={`star-${i}`}
                  points='0,-4 1.2,-1.2 4,0 1.2,1.2 0,4 -1.2,1.2 -4,0 -1.2,-1.2'
                  fill='#ffd700'
                  opacity='0'
                  transform={`translate(${particle.x}%, ${particle.y}%)`}
                >
                  <animateTransform
                    attributeName='transform'
                    type='translate'
                    values={`${particle.x}% ${particle.y}%;${endX}% ${endY}%`}
                    dur='2s'
                    begin={`${particle.delay + 0.1}s`}
                    repeatCount='1'
                  />
                  <animate
                    attributeName='opacity'
                    values='0;1;0'
                    dur='2s'
                    begin={`${particle.delay + 0.1}s`}
                    repeatCount='1'
                  />
                  <animateTransform
                    attributeName='transform'
                    type='rotate'
                    values='0;360'
                    dur='2s'
                    begin={`${particle.delay + 0.1}s`}
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
