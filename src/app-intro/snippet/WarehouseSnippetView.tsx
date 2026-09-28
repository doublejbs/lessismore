import { FC } from 'react';
import SnippetRowView from './SnippetRowView';

// 창고: 목록 행 세 개(AppIntroSpec §3.3).
const WarehouseSnippetView: FC = () => {
  return (
    <div className='app-intro-rows'>
      <SnippetRowView name='구스다운 침낭 800' number='652g' metas={['꼴로르', '침낭']} />
      <SnippetRowView name='초경량 1인 텐트' number='1.12kg' metas={['니모', '텐트']} />
      <SnippetRowView name='체어 제로' number='490g' metas={['헬리녹스', '체어']} />
    </div>
  );
};

export default WarehouseSnippetView;
