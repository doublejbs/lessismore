import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import GearEdit from '../model/GearEdit';
import { useFlow } from '@stackflow/react/future';

interface Props {
  gearEdit: GearEdit;
}

const GearEditConfirmView: FC<Props> = ({ gearEdit }) => {
  const errorMessage = gearEdit.getErrorMessage();
  const { pop } = useFlow();

  const handleClickConfirm = async () => {
    await gearEdit.register(pop);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        left: 0,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '0 16px',
        gap: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          textAlign: 'center',
        }}
      >
        {errorMessage}
      </div>
      <button
        style={{
          width: '100%',
          textAlign: 'center',
          backgroundColor: 'black',
          color: 'white',
          padding: '12px 0px',
          borderRadius: '10px',
        }}
        onClick={handleClickConfirm}
      >
        확인
      </button>
    </div>
  );
};

export default observer(GearEditConfirmView);
