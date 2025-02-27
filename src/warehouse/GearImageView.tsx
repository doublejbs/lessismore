import { FC, useState } from 'react';
import LoadingIconView from '../LoadingIconView.tsx';

interface Props {
  imageUrl: string;
}
const GearImageView: FC<Props> = ({ imageUrl }) => {
  const [loading, setLoading] = useState(true);

  const handleLoad = () => {
    setLoading(false);
  };

  if (!imageUrl) {
    return null;
  }

  return (
    <>
      {loading && <LoadingIconView />}
      <img
        width={120}
        height={160}
        src={imageUrl}
        onLoad={handleLoad}
        style={{
          display: loading ? 'none' : 'block',
          objectFit: 'cover',
          overflow: 'hidden',
        }}
      />
    </>
  );
};

export default GearImageView;
