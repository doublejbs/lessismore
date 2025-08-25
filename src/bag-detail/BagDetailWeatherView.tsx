import { observer } from 'mobx-react-lite';
import { FC, useState, useEffect } from 'react';
import usePreventScroll from '../hooks/usePreventScroll';
import BagDetail from './model/BagDetail';

interface Props {
  bagDetail: BagDetail;
}

interface WeatherData {
  location: string;
  current: {
    temp: number;
    description: string;
    icon: string;
    humidity: number;
    windSpeed: number;
  };
  forecast: Array<{
    date: string;
    temp: {
      max: number;
      min: number;
    };
    description: string;
    icon: string;
    humidity: number;
  }>;
}

const BagDetailWeatherView: FC<Props> = ({ bagDetail }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [location, setLocation] = useState('서울');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  usePreventScroll(isModalOpen);

  const fetchWeatherData = async (locationName: string): Promise<WeatherData> => {
    // bagDetail에서 여행 날짜 정보 가져오기
    const startDate = bagDetail.getStartDate();
    const endDate = bagDetail.getEndDate();

    // 여행 날짜 범위에 맞는 예보 생성
    const travelDays = endDate.diff(startDate, 'day') + 1;
    const forecastDays = Math.min(travelDays, 5); // 최대 5일간 예보

    const forecast = [];
    for (let i = 0; i < forecastDays; i++) {
      const forecastDate = startDate.add(i, 'day');
      forecast.push({
        date: forecastDate.format('MM-DD'),
        temp: {
          max: Math.floor(Math.random() * 15) + 15, // 15-30도 랜덤
          min: Math.floor(Math.random() * 10) + 5, // 5-15도 랜덤
        },
        description: ['맑음', '구름많음', '비', '구름조금'][Math.floor(Math.random() * 4)],
        icon: ['01d', '03d', '10d', '02d'][Math.floor(Math.random() * 4)],
        humidity: Math.floor(Math.random() * 40) + 40, // 40-80% 랜덤
      });
    }

    // Mock 데이터 - 실제 API 연동시 교체
    const mockData: WeatherData = {
      location: locationName,
      current: {
        temp: 18,
        description: '맑음',
        icon: '01d',
        humidity: 65,
        windSpeed: 2.3,
      },
      forecast,
    };

    return new Promise((resolve) => {
      setTimeout(() => resolve(mockData), 1000);
    });
  };

  const handleLocationClick = () => {
    setIsModalOpen(true);
  };

  const handleSave = async (newLocation: string) => {
    if (!newLocation.trim()) {
      alert('위치를 입력해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      const weather = await fetchWeatherData(newLocation);
      setWeatherData(weather);
      setLocation(newLocation);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to fetch weather:', error);
      alert('날씨 정보를 가져오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const getWeatherIcon = (iconCode: string) => {
    const iconMap: { [key: string]: string } = {
      '01d': '☀️',
      '01n': '🌙',
      '02d': '⛅',
      '02n': '☁️',
      '03d': '☁️',
      '03n': '☁️',
      '04d': '☁️',
      '04n': '☁️',
      '09d': '🌧️',
      '09n': '🌧️',
      '10d': '🌦️',
      '10n': '🌧️',
      '11d': '⛈️',
      '11n': '⛈️',
      '13d': '❄️',
      '13n': '❄️',
      '50d': '🌫️',
      '50n': '🌫️',
    };
    return iconMap[iconCode] || '🌤️';
  };

  useEffect(() => {
    fetchWeatherData(location).then(setWeatherData);
  }, []);

  return (
    <>
      {/* 날씨 예보 영역 */}
      {weatherData && (
        <>
          <div
            style={{
              width: '100%',
              backgroundColor: '#F2F4F6',
              minHeight: '0.625rem',
            }}
          />
          <div
            style={{
              width: '100%',
              backgroundColor: 'white',
              padding: '1rem 1.25rem',
            }}
          >
            <div
              style={{
                fontSize: '1.125rem',
                fontWeight: 'bold',
                marginBottom: '12px',
                color: '#333',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>{getWeatherIcon(weatherData.current.icon)}</span>
              <span
                style={{
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'background-color 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                onClick={handleLocationClick}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {location}
                <svg
                  width='14'
                  height='14'
                  viewBox='0 0 24 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                  style={{ opacity: 0.6 }}
                >
                  <path
                    d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                  <path
                    d='m18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </span>
              <span style={{ fontSize: '0.875rem', color: '#666', fontWeight: 'normal' }}>
                {weatherData.current.description}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                overflowX: 'scroll',
                scrollbarWidth: 'none',
                paddingBottom: '4px',
                justifyContent: 'space-around',
              }}
            >
              {weatherData.forecast.map((day, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    minWidth: '60px',
                    padding: '0.75rem 0.5rem',
                    backgroundColor: index === 0 ? '#f8f9fa' : 'white',
                    borderRadius: '8px',
                    border: index === 0 ? '1px solid #e9ecef' : 'none',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: '500' }}>
                    {index === 0 ? '오늘' : day.date}
                  </span>
                  <span style={{ fontSize: '1.5rem' }}>{getWeatherIcon(day.icon)}</span>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.2rem',
                    }}
                  >
                    <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#333' }}>
                      {day.temp.max}°
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#999' }}>{day.temp.min}°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            width: '100%',
            height: '100%',
            zIndex: 50,
          }}
          onClick={handleCancel}
        >
          <div
            style={{
              width: '100%',
              position: 'fixed',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'white',
              bottom: '0',
              borderRadius: '16px 16px 0 0',
              padding: '24px',
              lineHeight: 1.4,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: '18px',
                fontWeight: 'bold',
                marginBottom: '8px',
                textAlign: 'center',
              }}
            >
              여행지 날씨 설정
            </div>
            <div
              style={{
                fontSize: '14px',
                color: '#666',
                textAlign: 'center',
                marginBottom: '20px',
              }}
            >
              여행지의 날씨를 확인하고 싶은 위치를 입력해주세요
            </div>

            <LocationInput
              location={location}
              onSave={handleSave}
              onCancel={handleCancel}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}
    </>
  );
};

interface LocationInputProps {
  location: string;
  onSave: (location: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const LocationInput: FC<LocationInputProps> = ({ location, onSave, onCancel, isLoading }) => {
  const [inputValue, setInputValue] = useState(location);
  const popularLocations = ['서울', '부산', '제주', '강릉', '경주', '속초', '전주', '대구'];

  const handleLocationSelect = (selectedLocation: string) => {
    setInputValue(selectedLocation);
  };

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <input
          type='text'
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder='도시명을 입력하세요'
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            fontSize: '14px',
            color: '#666',
            marginBottom: '8px',
          }}
        >
          인기 여행지
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          {popularLocations.map((loc) => (
            <button
              key={loc}
              onClick={() => handleLocationSelect(loc)}
              style={{
                padding: '6px 12px',
                fontSize: '14px',
                backgroundColor: inputValue === loc ? '#007bff' : '#f8f9fa',
                color: inputValue === loc ? 'white' : '#666',
                border: '1px solid #ddd',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '8px',
        }}
      >
        <button
          onClick={onCancel}
          disabled={isLoading}
          style={{
            flex: 1,
            backgroundColor: 'white',
            color: '#666',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            border: '1px solid #ddd',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          취소
        </button>
        <button
          onClick={() => onSave(inputValue)}
          disabled={isLoading || !inputValue.trim()}
          style={{
            flex: 1,
            backgroundColor: isLoading || !inputValue.trim() ? '#666' : 'black',
            color: 'white',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: isLoading || !inputValue.trim() ? 'not-allowed' : 'pointer',
            border: 'none',
          }}
        >
          {isLoading ? '로딩 중...' : '적용'}
        </button>
      </div>
    </div>
  );
};

export default observer(BagDetailWeatherView);
