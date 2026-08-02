import React, { FC, useState } from 'react';
import Gear from '../model/Gear';
import BagDetail from './model/BagDetail';
import BagDetailImageView from './BagDetailImageView';
import { observer } from 'mobx-react-lite';
import usePreventScroll from '../hooks/usePreventScroll';

interface Props {
  gear: Gear;
  bagDetail: BagDetail;
}

const BagDetailGearView: FC<Props> = ({ gear, bagDetail }) => {
  const imageUrl = gear.getImageUrl();
  const isUseless = bagDetail.isUseless(gear);
  const [showMenu, setShowMenu] = useState(false);

  usePreventScroll(showMenu);

  const handleClickMenu = () => {
    setShowMenu(true);
  };

  const handleClickDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    bagDetail.delete(gear);
    setShowMenu(false);
  };

  const handleClickEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    bagDetail.goToEditGear(gear);
  };

  const handleClickBack = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          gap: '6px',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            minWidth: '80px',
            backgroundColor: '#F1F1F1',
            borderRadius: '4px',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <BagDetailImageView imageUrl={imageUrl} shadow={isUseless} />
          {isUseless && (
            <div
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                position: 'absolute',
                transform:
                  'translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))',
                rotate: '-10.78deg',
                letterSpacing: '-1.5px',
              }}
            >
              useless
            </div>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'start',
            flexGrow: 1,
            color: isUseless ? 'grey' : 'black',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{gear.getCompany()}</span>
                  {gear.hasUsedRate() && (
                    <div
                      style={{
                        borderRadius: '8px',
                        backgroundColor: 'rgb(235, 235, 235)',
                        color: 'black',
                        padding: '3px 6px',
                        fontSize: '10px',
                        lineHeight: '1',
                      }}
                    >
                      사용률 {gear.getUsedRate()}%
                    </div>
                  )}
                </div>
                <div className={'text-ellipsis'} style={{ fontWeight: 'bold', fontSize: '14px' }}>
                  <span>{gear.getName()}</span>
                </div>
                <div style={{ fontSize: '14px' }}>
                  <span>{gear.getColor()}</span>
                </div>
              </div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                <span>{gear.getWeight()}g</span>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: '32px',
            height: '100%',
          }}
        >
          <button
            style={{
              display: 'flex',
              justifyContent: 'center',
            }}
            onClick={handleClickMenu}
          >
            <svg
              width='5'
              height='18'
              viewBox='0 0 6 22'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M0.980387 2.93852C0.980387 2.38287 1.1784 1.90736 1.57443 1.51201C1.96978 1.11598 2.44528 0.917969 3.00094 0.917969C3.55659 0.917969 4.03243 1.11598 4.42845 1.51201C4.82381 1.90736 5.02148 2.38287 5.02148 2.93852C5.02148 3.49417 4.82381 3.96967 4.42845 4.36502C4.03243 4.76105 3.55659 4.95907 3.00094 4.95907C2.44528 4.95907 1.96978 4.76105 1.57443 4.36502C1.1784 3.96967 0.980387 3.49417 0.980387 2.93852ZM0.980387 11.0002C0.980387 10.4445 1.1784 9.96901 1.57443 9.57366C1.96978 9.17763 2.44528 8.97961 3.00094 8.97961C3.55659 8.97961 4.03243 9.17763 4.42845 9.57366C4.82381 9.96901 5.02148 10.4445 5.02148 11.0002C5.02148 11.5558 4.82381 12.0317 4.42845 12.4277C4.03243 12.823 3.55659 13.0207 3.00094 13.0207C2.44528 13.0207 1.96978 12.823 1.57443 12.4277C1.1784 12.0317 0.980387 11.5558 0.980387 11.0002ZM0.980386 19.0618C0.980386 18.5062 1.1784 18.0303 1.57443 17.6343C1.96978 17.2389 2.44528 17.0413 3.00094 17.0413C3.55659 17.0413 4.03243 17.2389 4.42845 17.6343C4.82381 18.0303 5.02148 18.5062 5.02148 19.0618C5.02148 19.6175 4.82381 20.0933 4.42845 20.4893C4.03243 20.8847 3.55659 21.0824 3.00093 21.0824C2.44528 21.0824 1.96978 20.8847 1.57443 20.4893C1.1784 20.0933 0.980386 19.6175 0.980386 19.0618Z'
                fill='black'
              />
            </svg>
          </button>
        </div>
      </div>
      {showMenu && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 40,
          }}
          onClick={handleClickBack}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '20px 0 0',
              gap: 16,
              position: 'fixed',
              width: '100%',
              height: 229,
              left: 0,
              bottom: 0,
              backgroundColor: 'white',
              borderRadius: '16px 16px 0 0',
              paddingTop: 20,
              zIndex: 10,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '0 12px',
              }}
            >
              <button
                style={{
                  padding: '12px 18px',
                  display: 'flex',
                  gap: '10px',
                }}
                onClick={handleClickEdit}
              >
                <div>
                  <svg
                    width='21'
                    height='20'
                    viewBox='0 0 21 20'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <g clipPath='url(#clip0_387_12207)'>
                      <path
                        d='M4.67253 18.5519C4.21419 18.5519 3.82169 18.3886 3.49503 18.0619C3.16891 17.7358 3.00586 17.3436 3.00586 16.8853V5.21859C3.00586 4.76025 3.16891 4.36775 3.49503 4.04109C3.82169 3.71498 4.21419 3.55192 4.67253 3.55192H12.11L10.4434 5.21859H4.67253V16.8853H16.3392V11.0936L18.0059 9.42692V16.8853C18.0059 17.3436 17.8428 17.7358 17.5167 18.0619C17.19 18.3886 16.7975 18.5519 16.3392 18.5519H4.67253ZM13.985 4.03109L15.1725 5.19775L9.67253 10.6978V11.8853H10.8392L16.36 6.36442L17.5475 7.53109L11.5475 13.5519H8.00586V10.0103L13.985 4.03109ZM17.5475 7.53109L13.985 4.03109L16.0684 1.94775C16.4017 1.61442 16.8011 1.44775 17.2667 1.44775C17.7317 1.44775 18.1239 1.61442 18.4434 1.94775L19.61 3.13525C19.9295 3.4547 20.0892 3.84359 20.0892 4.30192C20.0892 4.76025 19.9295 5.14914 19.61 5.46859L17.5475 7.53109Z'
                        fill='black'
                      />
                    </g>
                    <defs>
                      <clipPath id='clip0_387_12207'>
                        <rect width='20' height='20' fill='white' transform='translate(0.505859)' />
                      </clipPath>
                    </defs>
                  </svg>
                </div>
                <span>수정하기</span>
              </button>
              <button
                style={{
                  padding: '12px 18px',
                  display: 'flex',
                  gap: '10px',
                }}
                onClick={handleClickDelete}
              >
                <div>
                  <svg
                    width='21'
                    height='20'
                    viewBox='0 0 21 20'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <path
                      d='M6.33984 17.5C5.88151 17.5 5.48929 17.3369 5.16318 17.0108C4.83651 16.6842 4.67318 16.2917 4.67318 15.8333V5H3.83984V3.33333H8.00651V2.5H13.0065V3.33333H17.1732V5H16.3398V15.8333C16.3398 16.2917 16.1768 16.6842 15.8507 17.0108C15.524 17.3369 15.1315 17.5 14.6732 17.5H6.33984ZM14.6732 5H6.33984V15.8333H14.6732V5ZM8.00651 14.1667H9.67318V6.66667H8.00651V14.1667ZM11.3398 14.1667H13.0065V6.66667H11.3398V14.1667Z'
                      fill='black'
                    />
                  </svg>
                </div>
                <span>삭제하기</span>
              </button>
            </div>
            <div
              style={{
                height: '100%',
                width: '100%',
                padding: '8px 20px',
              }}
            >
              <button
                style={{
                  width: '100%',
                  backgroundColor: 'black',
                  color: 'white',
                  fontSize: '16px',
                  padding: '18px 133px',
                  borderRadius: '10px',
                }}
                onClick={handleClickBack}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default observer(BagDetailGearView);
