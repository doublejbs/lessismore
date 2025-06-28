import { FC, useState } from 'react';
import LoadingIconView from '../../LoadingIconView.tsx';

interface Props {
  imageUrl: string;
}
const GearImageView: FC<Props> = ({ imageUrl }) => {
  const [loading, setLoading] = useState(true);

  const handleLoad = () => {
    setLoading(false);
  };

  console.log('imageUrl', imageUrl);

  if (!imageUrl || !String(imageUrl).includes('.com')) {
    return null;
  }

  return (
    <>
      {loading && <LoadingIconView />}
      <img
        alt={'Gear'}
        src={imageUrl}
        onLoad={handleLoad}
        style={{
          display: loading ? 'none' : 'block',
          objectFit: 'cover',
          overflow: 'hidden',
          height: '100%',
        }}
      />
    </>
  );
};

export default GearImageView;
