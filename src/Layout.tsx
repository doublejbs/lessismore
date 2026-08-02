import { FC, ReactNode } from 'react';

interface Props {
  vh?: boolean;
  children: ReactNode;
}

const Layout: FC<Props> = ({ children, vh = false }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: vh ? '100vh' : '100%',
        width: '100%',
        padding: '0 20px 20px 20px',
        position: 'relative',
      }}
    >
      {children}
    </div>
  );
};

export default Layout;
