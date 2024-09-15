import { FC, ReactNode } from 'react';
import Bottom from './Bottom';
import AddButton from './warehouse/AddButton';

interface Props {
  children: ReactNode;
}

const Layout: FC<Props> = ({ children }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {children}
    </div>
  );
};

export default Layout;
