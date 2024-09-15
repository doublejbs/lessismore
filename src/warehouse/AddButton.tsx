import { FC } from 'react';

interface Props {
  showAdd: () => void;
}

const AddButton: FC<Props> = ({ showAdd }) => {
  const handleClick = () => {
    showAdd();
  };

  return (
    <button
      style={{
        position: 'fixed',
        right: '10px',
        bottom: '90px',
        borderRadius: '10px',
        border: '1px solid black',
        width: '80px',
        height: '80px',
        background: 'black',
        color: 'white',
        fontWeight: 'lighter',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        overflow: 'hidden',
        fontSize: '60px',
      }}
      onClick={handleClick}
    >
      +
    </button>
  );
};

export default AddButton;
