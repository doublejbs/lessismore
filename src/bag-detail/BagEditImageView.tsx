import { FC, useState } from 'react';
import LoadingIconView from '../LoadingIconView';

interface Props {
  imageUrl: string;
  shadow?: boolean;
}

const BagEditImageView: FC<Props> = ({ imageUrl, shadow }) => {
  const [loading, setLoading] = useState(!!imageUrl);

  const handleLoad = () => {
    setLoading(false);
  };

  return (
    <>
      {loading && <LoadingIconView />}
      {imageUrl && (
        <img
          src={imageUrl}
          width={2000}
          height={2000}
          onLoad={handleLoad}
          style={{
            display: loading ? 'none' : 'block',
            objectFit: 'cover',
            filter: shadow ? 'brightness(0.9)' : 'brightness(1)',
          }}
        />
      )}
    </>
  );
};

export default BagEditImageView;
