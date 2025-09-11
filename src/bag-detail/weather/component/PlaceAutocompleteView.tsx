import { useRef, useEffect } from 'react';

interface Props {
  onPlaceSelect: (place: google.maps.places.Place) => void;
  isLoaded: boolean;
}

const PlaceAutocompleteView = ({ onPlaceSelect, isLoaded }: Props) => {
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const placeAutocompleteElementRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(
    null
  );

  const handlePlaceSelect = async (event: any) => {
    const place = event.placePrediction.toPlace();
    await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });

    if (place) {
      onPlaceSelect(place);
    }
  };

  useEffect(() => {
    if (isLoaded && autocompleteRef.current && !placeAutocompleteElementRef.current) {
      const placeAutocomplete = new google.maps.places.PlaceAutocompleteElement({});

      Object.assign(placeAutocomplete.style, {
        boxSizing: 'border-box',
        border: '1px solid transparent',
        width: '100%',
        height: '40px',
        borderRadius: '4px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
        fontSize: '14px',
        outline: 'none',
        position: 'relative',
      });
      placeAutocomplete.addEventListener('gmp-select', handlePlaceSelect);
      autocompleteRef.current.appendChild(placeAutocomplete);
      placeAutocompleteElementRef.current = placeAutocomplete;
    }

    return () => {
      if (placeAutocompleteElementRef.current) {
        placeAutocompleteElementRef.current.removeEventListener('gmp-select', handlePlaceSelect);
      }
    };
  }, [isLoaded]);

  return (
    <div
      ref={autocompleteRef}
      style={{
        position: 'relative',
        zIndex: 1001,
        width: '240px',
        margin: '0 auto',
        marginBottom: '10px',
      }}
    />
  );
};

export default PlaceAutocompleteView;
