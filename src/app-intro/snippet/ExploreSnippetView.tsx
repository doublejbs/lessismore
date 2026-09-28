import { FC } from 'react';

const CHIPS = ['텐트', '침낭', '배낭'];
const SELECTED_CHIP = '텐트';

// 박지·탐색: 칩 줄, 선택 하나는 잉크 채움(AppIntroSpec §3.3). 칩은 모서리 10·연회색 채움(앱 HM-8).
const ExploreSnippetView: FC = () => {
  return (
    <div className='app-intro-chips'>
      {CHIPS.map((chip) => {
        const isSelected = chip === SELECTED_CHIP;

        return (
          <span
            key={chip}
            className={isSelected ? 'app-intro-chip app-intro-chip--selected' : 'app-intro-chip'}
          >
            {chip}
          </span>
        );
      })}
    </div>
  );
};

export default ExploreSnippetView;
