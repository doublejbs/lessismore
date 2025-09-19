import { FC, useEffect, useState } from 'react';
import CustomGearView from './CustomGearView';
import CustomGear from '../model/CustomGear';
import { AppScreen } from '@stackflow/plugin-basic-ui';

const CustomGearWrapper: FC = () => {
  const [customGear] = useState(() => CustomGear.new());

  useEffect(() => {
    customGear.initialize();
  }, []);

  return (
    <AppScreen>
      <CustomGearView customGear={customGear} />
    </AppScreen>
  );
};

export default CustomGearWrapper;
