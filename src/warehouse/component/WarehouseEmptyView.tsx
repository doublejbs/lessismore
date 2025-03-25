import { FC } from 'react';
import Layout from '../../Layout';
import Bottom from '../../Bottom';

const WarehouseEmptyView: FC = () => {
  const handleClick = () => {};

  return (
    <Layout>
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <button
          style={{
            backgroundColor: 'black',
            color: 'white',
            width: '167px',
            height: '60px',
            borderRadius: '10px',
            fontSize: '16px',
          }}
          onClick={handleClick}
        >
          장비 추가하기
        </button>
      </div>
      <Bottom />
    </Layout>
  );
};

export default WarehouseEmptyView;
