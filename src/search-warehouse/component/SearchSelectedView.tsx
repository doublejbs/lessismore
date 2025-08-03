import { FC } from 'react';
import SearchWarehouse from '../model/SearchWarehouse';
import { observer } from 'mobx-react-lite';
import GearImageView from '../../warehouse/component/GearImageView';

interface Props {
  searchWarehouse: SearchWarehouse;
}

const SearchSelectedView: FC<Props> = ({ searchWarehouse }) => {
  const selectedCount = searchWarehouse.getSelectedCount();
  const selected = searchWarehouse.getSelected();

  if (selectedCount > 0) {
    return (
      <ul
        style={{
          width: '100%',
          height: '100%',
          paddingTop: '12px',
          display: 'flex',
          gap: '22px',
          scrollbarWidth: 'none',
          backgroundColor: 'white',
          paddingLeft: '20px',
        }}
      >
        {selected.map((gear) => {
          const handleClickDelete = () => {
            searchWarehouse.deleteSelected(gear);
          };

          return (
            <li
              key={gear.getId()}
              style={{
                display: 'flex',
                flexDirection: 'column',
                maxWidth: '64px',
                gap: '2px',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  right: '-10px',
                  top: '2px',
                }}
                onClick={handleClickDelete}
              >
                <svg
                  width='25'
                  height='24'
                  viewBox='0 0 25 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <rect x='0.609375' width='24' height='24' rx='12' fill='black' />
                  <path
                    d='M12.6098 13.3998L9.69292 16.3248C9.50852 16.5081 9.27382 16.5998 8.98884 16.5998C8.70386 16.5998 8.46917 16.5081 8.28477 16.3248C8.10143 16.1415 8.00977 15.9081 8.00977 15.6248C8.00977 15.3415 8.10143 15.1081 8.28477 14.9248L11.2098 11.9998L8.28477 9.108C8.10143 8.92359 8.00977 8.68889 8.00977 8.4039C8.00977 8.1189 8.10143 7.8842 8.28477 7.6998C8.4681 7.51647 8.70143 7.4248 8.98477 7.4248C9.2681 7.4248 9.50143 7.51647 9.68477 7.6998L12.6098 10.6248L15.5016 7.6998C15.686 7.51647 15.9207 7.4248 16.2057 7.4248C16.4907 7.4248 16.7254 7.51647 16.9098 7.6998C17.1098 7.8998 17.2098 8.1373 17.2098 8.4123C17.2098 8.6873 17.1098 8.91647 16.9098 9.0998L13.9848 11.9998L16.9098 14.9167C17.0931 15.1011 17.1848 15.3357 17.1848 15.6207C17.1848 15.9057 17.0931 16.1404 16.9098 16.3248C16.7098 16.5248 16.4723 16.6248 16.1973 16.6248C15.9223 16.6248 15.6931 16.5248 15.5098 16.3248L12.6098 13.3998Z'
                    fill='white'
                  />
                </svg>
              </div>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: '#F1F1F1',
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: '64px',
                  borderRadius: '4px',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '2px solid #E7E7E7',
                }}
              >
                <GearImageView imageUrl={gear.getImageUrl()} />
              </div>
              <div
                className={'text-ellipsis-single'}
                style={{
                  fontSize: '13px',
                }}
              >
                {gear.getName()}
              </div>
            </li>
          );
        })}
      </ul>
    );
  } else {
    return null;
  }
};

export default observer(SearchSelectedView);
