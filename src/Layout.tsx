import { FC, ReactNode } from 'react';

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
        padding: '20px',
      }}
    >
      {children}
    </div>
  );
};

export default Layout;
