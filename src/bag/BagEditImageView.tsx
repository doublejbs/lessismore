import { FC, useState } from 'react';
import LoadingIconView from '../LoadingIconView.tsx';

interface Props {
  imageUrl: string;
  isAdded: boolean;
}

const BagEditImageView: FC<Props> = ({ imageUrl, isAdded }) => {
  const [loading, setLoading] = useState(true);

  const handleLoad = () => {
    setLoading(false);
  };

  return (
    <>
      {loading && <LoadingIconView />}
      <img
        src={imageUrl}
        width={'100%'}
        height={'100%'}
        onLoad={handleLoad}
        style={{
          display: loading ? 'none' : 'block',
          filter: isAdded ? 'brightness(50%)' : 'none',
        }}
      />
    </>
  );
};

export default BagEditImageView;
