import { FC, useState } from 'react';
import LoadingIconView from '../../LoadingIconView';

interface Props {
  imageUrl: string;
}

const BagEditImageView: FC<Props> = ({ imageUrl }) => {
  const [loading, setLoading] = useState(true);

  const handleLoad = () => {
    setLoading(false);
  };

  return (
    <>
      {loading && <LoadingIconView />}
      <img
        src={imageUrl}
        width={2000}
        height={2000}
        onLoad={handleLoad}
        style={{
          display: loading ? 'none' : 'block',
          objectFit: 'cover',
        }}
      />
    </>
  );
};

export default BagEditImageView;
