import { useState, useEffect } from 'react';

interface LocationData {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
}

export function useGeolocation() {
  const [location, setLocation] = useState<LocationData>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation((prev) => ({ ...prev, error: 'GPS tidak didukung oleh browser ini.' }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
        });
      },
      (error) => {
        setLocation((prev) => ({ ...prev, error: error.message }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  return location;
}
