import { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomGear from '../custom-gear/model/CustomGear';

interface Props {
  customGear: CustomGear;
}

const AddButtonView: FC<Props> = ({ customGear }) => {
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  const handleClick = () => {
    setShowMenu(!showMenu);
  };

  if (showMenu) {
    const handleClickSearch = () => {
      navigate('/search');
    };

    const handleClickCustom = () => {
      customGear.show();
    };

    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          width: '100%',
          height: '100%',
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: '200px',
            height: '104px',
            position: 'fixed',
            right: '20px',
            backgroundColor: 'white',
            bottom: '156px',
            borderRadius: '12px',
            padding: '8px 0',
            lineHeight: 1,
          }}
        >
          <button
            style={{
              padding: '12px 18px',
              display: 'flex',
              flexDirection: 'row',
              gap: '10px',
              width: '100%',
            }}
            onClick={handleClickSearch}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10.9167 9.66667H10.2583L10.025 9.44167C10.8417 8.49167 11.3333 7.25833 11.3333 5.91667C11.3333 2.925 8.90833 0.5 5.91667 0.5C2.925 0.5 0.5 2.925 0.5 5.91667C0.5 8.90833 2.925 11.3333 5.91667 11.3333C7.25833 11.3333 8.49167 10.8417 9.44167 10.025L9.66667 10.2583V10.9167L13.8333 15.075L15.075 13.8333L10.9167 9.66667ZM5.91667 9.66667C3.84167 9.66667 2.16667 7.99167 2.16667 5.91667C2.16667 3.84167 3.84167 2.16667 5.91667 2.16667C7.99167 2.16667 9.66667 3.84167 9.66667 5.91667C9.66667 7.99167 7.99167 9.66667 5.91667 9.66667Z"
                fill="black"
              />
            </svg>
            <div>검색으로 추가하기</div>
          </button>
          <button
            style={{
              padding: '12px 18px',
              display: 'flex',
              flexDirection: 'row',
              gap: '10px',
              width: '100%',
            }}
            onClick={handleClickCustom}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clip-path="url(#clip0_387_8814)">
                <path
                  d="M2.5 14.3751V17.5001H5.625L14.8417 8.28346L11.7167 5.15846L2.5 14.3751ZM17.2583 5.8668C17.5833 5.5418 17.5833 5.0168 17.2583 4.6918L15.3083 2.7418C14.9833 2.4168 14.4583 2.4168 14.1333 2.7418L12.6083 4.2668L15.7333 7.3918L17.2583 5.8668Z"
                  fill="black"
                />
              </g>
              <defs>
                <clipPath id="clip0_387_8814">
                  <rect width="20" height="20" fill="white" />
                </clipPath>
              </defs>
            </svg>
            <div>직접 작성하기</div>
          </button>
        </div>
        <button
          style={{
            backgroundColor: 'white',
            position: 'fixed',
            right: '20px',
            bottom: '80px',
            width: '48px',
            height: '48px',
            borderRadius: '32px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onClick={handleClick}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z"
              fill="black"
            />
          </svg>
        </button>
      </div>
    );
  } else {
    return (
      <button
        style={{
          position: 'fixed',
          width: '127px',
          height: '48px',
          fontSize: '16px',
          backgroundColor: 'black',
          color: 'white',
          borderRadius: ' 32px',
          padding: '12px 16px',
          bottom: '80px',
          right: '20px',
        }}
        onClick={handleClick}
      >
        장비 추가
      </button>
    );
  }
};

export default AddButtonView;
