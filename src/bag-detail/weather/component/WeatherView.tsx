import { useState } from 'react';
import { LoadScript, Libraries } from '@react-google-maps/api';
import PlaceAutocompleteView from './PlaceAutocompleteView';
import MapView from './MapView';

const center = {
  lat: 37.5665, // 초기 서울 좌표
  lng: 126.978,
};

const libraries: Libraries = ['places', 'marker'];

const WeatherView = () => {
  const [mapCenter, setMapCenter] = useState(center);
  const [isLoaded, setIsLoaded] = useState(false);
  const [zoom, setZoom] = useState(10);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number }>(center);

  const handlePlaceSelect = (place: google.maps.places.Place) => {
    console.log('선택한 장소:', place);
    if (!place.location) {
      return;
    } else {
      if (place.location) {
        console.log('place.location', place.location);
        const location = {
          lat: place.location.lat(),
          lng: place.location.lng(),
        };

        setMapCenter(location);
        setMarkerPosition(location);
        setZoom(17);
        console.log('선택한 장소:', place.name, location);
      }
    }
  };

  const onScriptLoad = () => {
    setIsLoaded(true);
  };

  return (
    <LoadScript
      googleMapsApiKey='AIzaSyBYYprHdpI_4j3_yERPOcImb-mw2bNFVYU'
      libraries={libraries}
      version='weekly'
      onLoad={onScriptLoad}
    >
      <div className='p-2'>
        <PlaceAutocompleteView onPlaceSelect={handlePlaceSelect} isLoaded={isLoaded} />
        <MapView center={mapCenter} zoom={zoom} markerPosition={markerPosition} />
      </div>
    </LoadScript>
  );
};

export default WeatherView;
