import React, { FC, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import BagEditWarehouseView from './BagEditWarehouseView';
import BagEditWarehouseFiltersView from './BagEditWarehouseFiltersView';
import BagEdit from './model/BagEdit';
import { FlipCounter } from './components/FlipCounter';
import BagEditWarehouseAddView from './BagEditWarehouseAddView';
import usePreventScroll from '../hooks/usePreventScroll';

interface Props {
  bagEdit: BagEdit;
}

const BagEditView: FC<Props> = ({ bagEdit }) => {
  const weight = bagEdit.getWeight();
  const count = bagEdit.getCount();
  const showMenu = bagEdit.isAddMenuVisible();

  usePreventScroll(showMenu, false);

  const handleClickBack = () => {
    bagEdit.back();
  };

  const handleClickSave = () => {
    bagEdit.save();
  };

  const handleClickAddGear = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    bagEdit.showAddMenu();
  };

  const onHideMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    bagEdit.hideAddMenu();
  };

  useEffect(() => {
    bagEdit.initialize();
  }, []);

  if (!bagEdit.isInitialized()) {
    return null;
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          width: '100%',
          display: 'flex',
          left: 0,
          top: 0,
          zIndex: 10,
          padding: '0.5rem',
          backgroundColor: 'white',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
          }}
          onClick={handleClickBack}
        >
          <svg
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              d='M16.2844 20.475C15.9844 20.475 15.6844 20.375 15.4844 20.075L7.98438 12.575C7.48438 12.075 7.48438 11.375 7.98438 10.875L15.4844 3.375C15.9844 2.875 16.6844 2.875 17.1844 3.375C17.6844 3.875 17.6844 4.575 17.1844 5.075L10.3844 11.775L17.0844 18.475C17.5844 18.975 17.5844 19.675 17.0844 20.175C16.8844 20.375 16.5844 20.475 16.2844 20.475Z'
              fill='#191F28'
            />
          </svg>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '19px',
          }}
        >
          <FlipCounter value={weight} />
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0 12px',
            }}
          >
            <span
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
              }}
            >
              내 장비
            </span>
            <button
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                backgroundColor: '#EBEBEB',
                borderRadius: '26px',
                padding: '8px 16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '14px',
                  height: '100%',
                }}
              >
                <svg
                  width='14'
                  height='14'
                  viewBox='0 0 14 14'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path d='M14 8H8V14H6V8H0V6H6V0H8V6H14V8Z' fill='black' />
                </svg>
              </div>
              <span
                style={{
                  lineHeight: 1,
                  fontSize: '14px',
                }}
                onClick={handleClickAddGear}
              >
                장비 추가
              </span>
            </button>
          </div>
          <BagEditWarehouseFiltersView bagEdit={bagEdit} />
        </div>
      </div>
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: '100%',
            minHeight: '204px',
          }}
        ></div>
        <BagEditWarehouseView bagEdit={bagEdit} />
        <div
          style={{
            minHeight: '72px',
          }}
        ></div>
      </div>
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '100%',
          padding: '12px 20px',
          backgroundColor: 'white',
        }}
      >
        <button
          style={{
            backgroundColor: 'black',
            width: '100%',
            borderRadius: '10px',
            padding: '12px 24px',
            color: 'white',
            fontSize: '16px',
            fontWeight: '300',
          }}
          onClick={handleClickSave}
        >
          {count ? `${count}개 추가하기` : '추가할 장비를 선택해주세요'}
        </button>
      </div>
      <BagEditWarehouseAddView bagEdit={bagEdit} onHideMenu={onHideMenu} />
    </>
  );
};

export default observer(BagEditView);
