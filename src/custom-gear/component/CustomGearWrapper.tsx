import { FC, useEffect, useState } from 'react';
import CustomGearView from './CustomGearView';
import CustomGear from '../model/CustomGear';
import { useLocation, useNavigate } from 'react-router-dom';

const CustomGearWrapper: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [customGear] = useState(() => CustomGear.new(navigate, location));

  useEffect(() => {
    customGear.initialize();
  }, []);

  return <CustomGearView customGear={customGear} />;
};

export default CustomGearWrapper;
