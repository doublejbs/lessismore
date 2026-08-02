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

  if (!!imageUrl && (String(imageUrl).includes('.com') || String(imageUrl).includes('.net'))) {
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
  } else {
    return null;
  }
};

export default GearImageView;
