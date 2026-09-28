import { FC } from 'react';

interface Props {
  name: string;
  number?: string;
  metas: string[];
}

// 앱 목록 행 문법: 이름 16 medium / 메타 14 잉크, 숫자를 맨 앞에 두고 ` · `로 잇는다(앱 HM-8).
// 숫자 조각만 콘덴스드로 갈아 끼운다. 배지·칩을 행 안에 두지 않는다.
const SnippetRowView: FC<Props> = ({ name, number, metas }) => {
  const restMeta = metas.join(' · ');

  return (
    <div className='app-intro-row'>
      <p className='app-intro-row-name'>{name}</p>
      <p className='app-intro-row-meta'>
        {number !== undefined && (
          <>
            <span className='app-intro-number'>{number}</span>
            {restMeta && ' · '}
          </>
        )}
        {restMeta}
      </p>
    </div>
  );
};

export default SnippetRowView;
