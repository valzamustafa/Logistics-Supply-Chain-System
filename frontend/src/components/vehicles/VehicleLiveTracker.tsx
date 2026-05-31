// frontend/src/components/vehicles/VehicleLiveTracker.tsx
import { useState, useEffect, useRef } from 'react';
import { X, MapPin, Navigation, Truck, Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { vehicleService } from '../../services/driverService';

interface VehicleLocation {
  lat: number;
  lng: number;
  address: string;
  speed: number;
  heading: number;
  lastUpdate: string;
  progress: number;
  eta: string;
  distanceLeft: number;
  destination: string;
  driverName?: string;
}

interface VehicleLiveTrackerProps {
  vehicleId: number;
  plateNumber: string;
  model: string;
  imageUrl?: string | null;
  color?: string | null;
  onClose: () => void;
}

export function VehicleLiveTracker({ vehicleId, plateNumber, model, imageUrl, color, onClose }: VehicleLiveTrackerProps) {
  const [location, setLocation] = useState<VehicleLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchLocation = async () => {
    try {
      setRefreshing(true);

      const tracking = await vehicleService.getLiveTracking(vehicleId);
      const coordinates = parseCoordinates(tracking.currentLocation);
      const destination = tracking.destination || 'Destination pending';

      const liveLocation: VehicleLocation = {
        lat: coordinates?.lat ?? 0,
        lng: coordinates?.lng ?? 0,
        address: coordinates ? tracking.currentLocation || 'Driver GPS location' : 'Waiting for driver location update',
        speed: 0,
        heading: 0,
        lastUpdate: tracking.lastLocationUpdate || new Date().toISOString(),
        progress: getProgress(tracking.status),
        eta: getEta(tracking.estimatedDeliveryDate),
        distanceLeft: 0,
        destination,
        driverName: tracking.driverName || 'Assigned'
      };

      setLocation(liveLocation);
      setError(null);
    } catch (err) {
      setError('Failed to fetch vehicle location');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const parseCoordinates = (value?: string | null) => {
    if (!value) return null;

    const [latRaw, lngRaw] = value.split(',').map(part => part.trim());
    const lat = Number(latRaw);
    const lng = Number(lngRaw);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    return { lat, lng };
  };

  const getProgress = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === 'delivered') return 100;
    if (normalizedStatus === 'out for delivery') return 75;
    if (normalizedStatus === 'in transit') return 50;
    if (normalizedStatus === 'pending') return 10;
    return 0;
  };

  const getEta = (estimatedDeliveryDate?: string | null) => {
    if (!estimatedDeliveryDate) return 'N/A';

    const estimatedTime = new Date(estimatedDeliveryDate).getTime();
    const remainingMs = estimatedTime - Date.now();

    if (!Number.isFinite(estimatedTime) || remainingMs <= 0) {
      return 'Due now';
    }

    const totalMinutes = Math.ceil(remainingMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
  };

  useEffect(() => {
    fetchLocation();
    intervalRef.current = window.setInterval(fetchLocation, 10000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [vehicleId]);

  const getMapUrl = () => {
    if (location && location.lat !== 0 && location.lng !== 0) {
      return `https://maps.google.com/maps?q=${location.lat},${location.lng}&output=embed`;
    }
    return '';
  };

  const getSpeedColor = (speed: number) => {
    if (speed < 30) return 'text-green-400';
    if (speed < 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-slate-800 to-slate-700">
          <div className="flex items-center gap-3">
            {imageUrl ? (
              <img src={imageUrl} alt={model} className="w-12 h-12 rounded-xl object-cover border border-slate-600" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Truck className="w-5 h-5 text-cyan-400" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-slate-900">Live Tracking</h2>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span>{plateNumber} - {model}</span>
                {color && (
                  <span className="inline-flex items-center gap-1">
                    <span className="h-3 w-3 rounded-full border border-slate-500" style={{ backgroundColor: color }} />
                    {color}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs ${isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? 'Live' : 'Offline'}
            </div>
            <button
              onClick={fetchLocation}
              disabled={refreshing}
              className="p-2 hover:bg-slate-200 rounded-full transition"
            >
              <RefreshCw className={`w-5 h-5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-500">Loading vehicle location...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-400">{error}</p>
              <button onClick={fetchLocation} className="mt-4 px-4 py-2 bg-cyan-500 rounded-lg text-slate-900">
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
              <div className="lg:col-span-2">
                <div className="rounded-xl overflow-hidden border border-slate-200 h-96">
                  {location && location.lat !== 0 && location.lng !== 0 ? (
                    <iframe
                      title="Vehicle live tracking map"
                      src={getMapUrl()}
                      className="w-full h-full border-0"
                      allowFullScreen
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                      <p className="text-slate-500">Waiting for driver location update...</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-100/80 rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-semibold text-slate-900">Route Progress</span>
                    </div>
                    <span className="text-2xl font-bold text-cyan-400">{Math.round(location?.progress || 0)}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${location?.progress || 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <div>
                      <p className="text-slate-500">Time Left</p>
                      <p className="text-slate-900 font-semibold">{location?.eta || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-500">Distance Left</p>
                      <p className="text-slate-900 font-semibold">{location?.distanceLeft || 0} km</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-100/80 rounded-xl p-4 border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Vehicle Status</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-sm">Speed</span>
                      <span className={`font-mono font-bold ${getSpeedColor(location?.speed || 0)}`}>
                        {location?.speed || 0} km/h
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-sm">Driver</span>
                      <span className="text-slate-900 font-medium">{location?.driverName || 'Assigned'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-sm">Destination</span>
                      <span className="text-slate-900 text-sm text-right">{location?.destination || 'Warehouse'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-sm">Last Update</span>
                      <span className="text-slate-500 text-xs">
                        {location?.lastUpdate ? new Date(location.lastUpdate).toLocaleTimeString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-100/80 rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-semibold text-slate-900">Current Location</span>
                  </div>
                  <p className="text-slate-500 text-sm">{location?.address || 'Unknown'}</p>
                  <p className="text-slate-400 text-xs mt-2 font-mono">
                    {location?.lat?.toFixed(6)}, {location?.lng?.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-3 border-t border-slate-200 bg-slate-50 text-center text-xs text-slate-400">
          Live tracking updates every 10 seconds • Data is transmitted in real-time from vehicle GPS
        </div>
      </div>
    </div>
  );
}
