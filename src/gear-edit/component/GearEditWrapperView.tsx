import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import GearEditView from './GearEditView';
import GearEdit from '../model/GearEdit';
import GearEditDispatcher from '../model/GearEditDispatcher';
import CustomGearCategory from '../../custom-gear/model/CustomGearCategory';
import { useNavigate, useParams } from 'react-router-dom';

const GearEditWrapperView: FC = () => {
  const navigate = useNavigate();
  const [gearEdit] = useState(() =>
    GearEdit.from(GearEditDispatcher.new(), navigate, CustomGearCategory.new())
  );
  const { id } = useParams();
  const isInitialized = gearEdit.isInitialized();

  useEffect(() => {
    if (id) {
      gearEdit.initialize(id);
    }
  }, [id]);

  if (isInitialized) {
    return <GearEditView gearEdit={gearEdit} />;
  } else {
    return null;
  }
};

export default observer(GearEditWrapperView);
