import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import GearEditView from './GearEditView';
import GearEdit from '../model/GearEdit';
import GearEditDispatcher from '../model/GearEditDispatcher';
import CustomGearCategory from '../../custom-gear/model/CustomGearCategory';
import { AppScreen } from '@stackflow/plugin-basic-ui';

const GearEditWrapperView: FC = () => {
  const [gearEdit] = useState(() =>
    GearEdit.from(GearEditDispatcher.new(), CustomGearCategory.new())
  );

  return (
    <AppScreen>
      <GearEditView gearEdit={gearEdit} />
    </AppScreen>
  );
};

export default observer(GearEditWrapperView);
