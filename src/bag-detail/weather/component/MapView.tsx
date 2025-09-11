import { GoogleMap } from '@react-google-maps/api';
import { useRef, useEffect } from 'react';

interface Props {
  center: { lat: number; lng: number };
  zoom: number;
  markerPosition: { lat: number; lng: number };
}

const containerStyle = {
  width: '100%',
  height: '500px',
};

const MapView = ({ center, zoom, markerPosition }: Props) => {
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  const onMapLoad = (map: google.maps.Map) => {
    if (window.google?.maps?.marker?.AdvancedMarkerElement && map) {
      markerRef.current = new google.maps.marker.AdvancedMarkerElement({
        position: markerPosition,
        map,
      });
    } else {
      console.error('AdvancedMarkerElement를 사용할 수 없습니다.');
    }
  };

  const onClick = (e: google.maps.MapMouseEvent) => {
    const lat = e.latLng?.lat();
    const lng = e.latLng?.lng();

    if (lat && lng) {
      updateMarkerPosition({ lat, lng });
    }
  };

  const updateMarkerPosition = (position: { lat: number; lng: number }) => {
    if (markerRef.current) {
      markerRef.current.position = position;
    }
  };

  useEffect(() => {
    updateMarkerPosition(markerPosition);
  }, [markerPosition]);

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={zoom}
      onLoad={onMapLoad}
      onClick={onClick}
      options={{
        gestureHandling: 'greedy',
        mapId: '1b7a272c9871d39597e01186',
      }}
    />
  );
};

export default MapView;
