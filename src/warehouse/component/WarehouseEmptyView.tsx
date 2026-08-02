import { FC } from 'react';
import Bottom from '../../Bottom';
import Layout from '../../Layout';
import AddButtonView from './AddButtonView';
import UserMenu from './UserMenu';

const WarehouseEmptyView: FC = () => {
  return (
    <Layout vh={true}>
      <div style={{ position: 'absolute', top: 20, right: 16, zIndex: 10 }}>
        <UserMenu />
      </div>
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
          flex: 1,
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
