import { FC } from 'react';
import Layout from '../../Layout';
import Bottom from '../../Bottom';
import AddButtonView from './AddButtonView';

const WarehouseEmptyView: FC = () => {
  const handleClick = () => {};

  return (
    <Layout vh={true}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginTop: '8px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            fontWeight: '1000',
            fontSize: '48px',
            textAlign: 'center',
            display: 'inline-block',
            lineHeight: 1,
            letterSpacing: '-4.5px',
          }}
        >
          useless
        </div>
      </div>
      <div
        style={{
          width: '100%',
          fontSize: '24px',
          fontWeight: 'bold',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          paddingBottom: '53px',
        }}
      >
        <span>장비를 추가해 주세요</span>
      </div>
      <AddButtonView />
      <Bottom />
    </Layout>
  );
};

export default WarehouseEmptyView;
