import { FC } from 'react';
import BagEdit from '../bag/model/BagEdit';

interface Props {
  bagEdit: BagEdit;
  showMenu: boolean;
  onHideMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const BagEditWarehouseAddMenuView: FC<Props> = ({ bagEdit, showMenu, onHideMenu }) => {
  if (!showMenu) {
    return null;
  }

  const handleClickSearch = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    bagEdit.showSearch();
  };

  const handleClickWrite = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    bagEdit.showWrite();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        zIndex: 1000,
      }}
      onClick={onHideMenu}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          borderRadius: '10px  10px 0 0',
        }}
      >
        <div
          style={{
            padding: '12px 0',
            display: 'flex',
            gap: '10px',
          }}
          onClick={handleClickSearch}
        >
          <div style={{}}>
            <svg
              width='20'
              height='20'
              viewBox='0 0 20 20'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <g clip-path='url(#clip0_491_9024)'>
                <path
                  d='M12.9167 11.6667H12.2583L12.025 11.4417C12.8417 10.4917 13.3333 9.25833 13.3333 7.91667C13.3333 4.925 10.9083 2.5 7.91667 2.5C4.925 2.5 2.5 4.925 2.5 7.91667C2.5 10.9083 4.925 13.3333 7.91667 13.3333C9.25833 13.3333 10.4917 12.8417 11.4417 12.025L11.6667 12.2583V12.9167L15.8333 17.075L17.075 15.8333L12.9167 11.6667ZM7.91667 11.6667C5.84167 11.6667 4.16667 9.99167 4.16667 7.91667C4.16667 5.84167 5.84167 4.16667 7.91667 4.16667C9.99167 4.16667 11.6667 5.84167 11.6667 7.91667C11.6667 9.99167 9.99167 11.6667 7.91667 11.6667Z'
                  fill='black'
                />
              </g>
              <defs>
                <clipPath id='clip0_491_9024'>
                  <rect width='20' height='20' fill='white' />
                </clipPath>
              </defs>
            </svg>
          </div>
          <span
            style={{
              fontSize: '15px',
            }}
          >
            검색으로 추가하기
          </span>
        </div>
        <div
          style={{
            padding: '12px 0',
            display: 'flex',
            gap: '10px',
          }}
          onClick={handleClickWrite}
        >
          <div style={{}}>
            <svg
              width='20'
              height='20'
              viewBox='0 0 20 20'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <g clip-path='url(#clip0_491_9029)'>
                <path
                  d='M2.5 14.3751V17.5001H5.625L14.8417 8.28346L11.7167 5.15846L2.5 14.3751ZM17.2583 5.8668C17.5833 5.5418 17.5833 5.0168 17.2583 4.6918L15.3083 2.7418C14.9833 2.4168 14.4583 2.4168 14.1333 2.7418L12.6083 4.2668L15.7333 7.3918L17.2583 5.8668Z'
                  fill='black'
                />
              </g>
              <defs>
                <clipPath id='clip0_491_9029'>
                  <rect width='20' height='20' fill='white' />
                </clipPath>
              </defs>
            </svg>
          </div>
          <span
            style={{
              fontSize: '15px',
            }}
          >
            직접 작성하기
          </span>
        </div>
      </div>
    </div>
  );
};

export default BagEditWarehouseAddMenuView;
