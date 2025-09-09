import { useState } from 'react';
import { GoogleMap, LoadScript, Marker, Autocomplete } from '@react-google-maps/api';

const center = {
  lat: 37.5665, // 초기 서울 좌표
  lng: 126.978,
};

const containerStyle = {
  width: '100%',
  height: '500px',
};

const BagDetailWeatherView = () => {
  const [mapCenter, setMapCenter] = useState(center);
  const [markerPos, setMarkerPos] = useState(center);
  const [autocomplete, setAutocomplete] = useState(null);

  const onLoad = (autoC: any) => setAutocomplete(autoC);

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = (autocomplete as any).getPlace();
      if (!place.geometry || !place.geometry.location) return;

      const location = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };

      setMapCenter(location);
      setMarkerPos(location);

      console.log('선택한 장소:', place.name, location);
    }
  };

  return (
    <LoadScript
      googleMapsApiKey='AIzaSyBYYprHdpI_4j3_yERPOcImb-mw2bNFVYU' // 🔑 여기에 API 키 넣기
      libraries={['places']}
    >
      <div className='p-2'>
        <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
          <input
            id='search-input'
            type='text'
            placeholder='장소 검색'
            style={{
              boxSizing: `border-box`,
              border: `1px solid transparent`,
              width: `240px`,
              height: `40px`,
              padding: `0 12px`,
              borderRadius: `4px`,
              boxShadow: `0 2px 6px rgba(0, 0, 0, 0.3)`,
              fontSize: `14px`,
              outline: `none`,
              position: 'absolute',
              left: '50%',
              marginLeft: '-120px',
              top: '10px',
              zIndex: 1000,
            }}
          />
        </Autocomplete>

        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter}
          zoom={10}
          onClick={(e) => {
            const lat = e.latLng?.lat();
            const lng = e.latLng?.lng();
            setMarkerPos({ lat: lat ?? 0, lng: lng ?? 0 });
            console.log('지도에서 선택한 좌표:', lat, lng);
          }}
          options={{
            gestureHandling: 'greedy',
          }}
        >
          <Marker position={markerPos} />
        </GoogleMap>
      </div>
    </LoadScript>
  );
};

export default BagDetailWeatherView;
