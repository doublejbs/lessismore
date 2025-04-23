import Order from './Order.ts';
import OrderOption from './OrderOption.ts';
import OrderType from './OrderType.ts';
import { observer } from 'mobx-react-lite';

interface Props {
  order: Order;
}

const OrderButtonView = ({ order }: Props) => {
  const showOrderOptions = order.isShowOrderOptions();
  const selectedOrderName = order.getSelectedOrderName();

  const handleSortClick = () => {
    order.toggleOrderOptions();
  };

  const handleSortOptionClick = (orderOption: OrderOption, e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    order.setOrderOption(orderOption);
  };

  return (
    <div style={{ position: 'relative', height: '36px' }}>
      <button
        style={{
          height: '100%',
          fontSize: '16px',
          padding: '10px 4px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          whiteSpace: 'nowrap',
          color: 'black',
          flexDirection: 'row',
          gap: '0px',
          fontWeight: 'bold',
        }}
        onClick={handleSortClick}
      >
        {selectedOrderName}
        {showOrderOptions ? (
          <svg
            width='25'
            height='24'
            viewBox='0 0 25 24'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              d='M7.5 14L12.5008 9.42L17.5 14'
              stroke='#0A090B'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        ) : (
          <svg
            width='25'
            height='24'
            viewBox='0 0 25 24'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              d='M7.5 10L12.5008 14.58L17.5 10'
              stroke='#0A090B'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        )}
      </button>

      {showOrderOptions && (
        <div
          style={{
            position: 'absolute',
            top: '40px',
            right: '0',
            backgroundColor: 'white',
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
            borderRadius: '8px',
            zIndex: 10,
            minWidth: '120px',
          }}
        >
          {order.mapOrderOptions((option) => (
            <div
              key={option.getOrder()}
              style={{
                padding: '10px',
                cursor: 'pointer',
                color: option.isSelected() ? 'rgb(204, 241, 36)' : '#505967',
              }}
              onClick={(e: React.MouseEvent<HTMLDivElement>) => handleSortOptionClick(option, e)}
            >
              {option.getName()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default observer(OrderButtonView);
