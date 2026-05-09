
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { driverService, DriverShipment, DriverStats, DriverSchedule } from '../../services/driverService';
import { driverShipmentService } from '../../services/driverShipmentService';
import { MapPin, Navigation, Clock, CheckCircle, Truck, Phone, Mail, User, Settings, LogOut, AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

export function DriverDashboard() {
  const { user, logout } = useAuth();
  const [shipments, setShipments] = useState<DriverShipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<DriverShipment | null>(null);
  const [stats, setStats] = useState<DriverStats>({
    todaysDeliveries: 0,
    completedDeliveries: 0,
    pendingDeliveries: 0,
    totalDistance: 0,
    totalDeliveries: 0,
    onTimeRate: 0,
    averageRating: 0,
  });
  const [schedule, setSchedule] = useState<DriverSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [showProofModal, setShowProofModal] = useState(false);
  const [deliveryProof, setDeliveryProof] = useState('');
  const [deliverySignature, setDeliverySignature] = useState('');
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [driverId, setDriverId] = useState<number | null>(null);
  const [trackingLocation, setTrackingLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [isTrackingLive, setIsTrackingLive] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const watchIdRef = useRef<number | null>(null);


  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('synced');
      if (selectedShipmentId && isTrackingLive) {
        syncOfflineLocations();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [selectedShipmentId, isTrackingLive]);

  const syncOfflineLocations = async () => {
    const offlineLocations = localStorage.getItem('offline_locations');
    if (offlineLocations) {
      const locations = JSON.parse(offlineLocations);
      for (const loc of locations) {
        if (!loc.shipmentId) continue;
        try {
          await driverService.updateLocation(loc.shipmentId, {
            lat: loc.lat,
            lng: loc.lng,
            timestamp: loc.timestamp,
          });
        } catch (e) {
          console.error('Failed to sync location for shipment', loc.shipmentId, e);
        }
      }
      localStorage.removeItem('offline_locations');
    }
  };

  const saveLocationOffline = (location: any, shipmentId?: string) => {
    const existing = localStorage.getItem('offline_locations');
    const locations = existing ? JSON.parse(existing) : [];
    locations.push({ shipmentId: shipmentId ?? selectedShipmentId, ...location });
    localStorage.setItem('offline_locations', JSON.stringify(locations));
  };

  useEffect(() => {
    loadAllData();
    getCurrentLocation();
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setTrackingLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Current Location'
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          setTrackingError(error.message || 'Unable to read current location');
        }
      );
    } else {
      setTrackingError('Geolocation is not supported by this browser.');
    }
  };

  const sendTrackedLocation = async (shipmentIdToUse: string, locationData: { lat: number; lng: number; timestamp: string }) => {
    setTrackingError(null);
    setTrackingLocation({
      lat: locationData.lat,
      lng: locationData.lng,
      address: 'Live Location'
    });

    if (!isOnline) {
      saveLocationOffline(locationData, shipmentIdToUse);
      setSyncStatus('offline');
      return;
    }

    try {
      setSyncStatus('syncing');
      await driverService.updateLocation(shipmentIdToUse, locationData);
      setSyncStatus('synced');
    } catch (error) {
      console.error('Failed to update location:', error);
      saveLocationOffline(locationData, shipmentIdToUse);
      setSyncStatus('offline');
    }
  };

  const startLiveTracking = (shipmentIdParam?: string) => {
    const shipmentIdToUse = shipmentIdParam || selectedShipmentId;
    if (!shipmentIdToUse) {
      setTrackingError('No shipment selected for live tracking.');
      return;
    }

    if (!navigator.geolocation) {
      setTrackingError('Geolocation is not supported by this browser.');
      return;
    }

    setTrackingError(null);
    setIsTrackingLive(true);
    setSyncStatus('synced');

    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const initialLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date().toISOString(),
        };
        await sendTrackedLocation(shipmentIdToUse, initialLocation);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setTrackingError(error.message || 'Unable to read current location');
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const locationData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date().toISOString()
        };
        await sendTrackedLocation(shipmentIdToUse, locationData);
      },
      (error) => {
        console.error('Tracking error:', error);
        setTrackingError(error.message || 'Live tracking failed.');
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const stopLiveTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTrackingLive(false);
  };

  useEffect(() => {
    if (selectedShipment?.status === 'In Transit') {
      if (selectedShipment.id !== selectedShipmentId) {
        setSelectedShipmentId(selectedShipment.id);
      }

      if (!isTrackingLive) {
        startLiveTracking(selectedShipment.id);
      }
    }
  }, [selectedShipment, selectedShipmentId, isTrackingLive]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [shipmentsData, statsData, scheduleData, profileData] = await Promise.all([
        driverShipmentService.getMyShipments(),
        driverService.getStats(),
        driverService.getTodaySchedule(),
        driverService.getProfile(),
      ]);
      setShipments(shipmentsData);
      setStats(statsData);
      setSchedule(scheduleData);
      setIsAvailable(profileData.isAvailable);
      setDriverId(profileData.id);
      setProfile(profileData);
      if (shipmentsData.length > 0 && !selectedShipment) {
        setSelectedShipment(shipmentsData[0]);
        setSelectedShipmentId(shipmentsData[0].id);
      }
    } catch (error) {
      console.error('Failed to load driver data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAvailability = async () => {
    try {
      await driverService.updateAvailability(!isAvailable);
      setIsAvailable(!isAvailable);
    } catch (error) {
      console.error('Failed to update availability:', error);
    }
  };

  const startDelivery = async (shipmentId: string) => {
    setUpdating(true);
    try {
      await driverShipmentService.startDelivery(shipmentId);
      setSelectedShipmentId(shipmentId);
      
      await driverShipmentService.updateStatus(shipmentId, {
        status: 'In Transit',
        location: trackingLocation ? `${trackingLocation.lat},${trackingLocation.lng}` : 'Warehouse',
        notes: 'Driver started delivery'
      });
      startLiveTracking(shipmentId);
      await loadAllData();
      alert('Delivery started! Live tracking is now active. Supplier has been notified.');
    } catch (error) {
      console.error('Failed to start delivery:', error);
      alert('Failed to start delivery');
    } finally {
      setUpdating(false);
    }
  };

  const sendCurrentLocationNow = async () => {
    if (!selectedShipmentId || !trackingLocation) {
      return;
    }

    const locationData = {
      lat: trackingLocation.lat,
      lng: trackingLocation.lng,
      timestamp: new Date().toISOString(),
    };

    if (isOnline) {
      setSyncStatus('syncing');
      try {
        await driverService.updateLocation(selectedShipmentId, locationData);
        setSyncStatus('synced');
        alert('Current location sent successfully.');
      } catch (error) {
        console.error('Failed to send current location:', error);
        saveLocationOffline(locationData, selectedShipmentId ?? undefined);
        setSyncStatus('offline');
        alert('Unable to send location now. It has been queued for sync.');
      }
    } else {
      saveLocationOffline(locationData, selectedShipmentId ?? undefined);
      setSyncStatus('offline');
      alert('Offline mode: current location queued to sync when online.');
    }
  };

  const updateShipmentStatus = async (shipmentId: string, status: string, location?: string) => {
    setUpdating(true);
    try {
      await driverShipmentService.updateStatus(shipmentId, {
        status,
        location,
        notes: `Driver updated status to ${status}`
      });
      await loadAllData();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const completeDelivery = async (shipmentId: string) => {
    setUpdating(true);
    try {
      await driverShipmentService.completeDelivery(shipmentId, deliveryProof);
     
      await driverShipmentService.updateStatus(shipmentId, {
        status: 'Delivered',
        location: trackingLocation ? `${trackingLocation.lat},${trackingLocation.lng}` : 'Customer Location',
        notes: `Delivery completed. ${deliveryProof ? 'Proof: ' + deliveryProof : ''} Signature: ${deliverySignature}`
      });
      setShowProofModal(false);
      setDeliveryProof('');
      setDeliverySignature('');
      setSelectedShipmentId(null);
      stopLiveTracking();
      await loadAllData();
      alert('Delivery completed successfully! Supplier has been notified.');
    } catch (error) {
      console.error('Failed to complete delivery:', error);
      alert('Failed to complete delivery');
    } finally {
      setUpdating(false);
    }
  };

  const confirmAndStartShipment = async (shipmentId: string) => {
    setUpdating(true);
    try {
    
      await driverShipmentService.updateStatus(shipmentId, {
        status: 'In Transit',
        location: trackingLocation ? `${trackingLocation.lat},${trackingLocation.lng}` : 'Warehouse',
        notes: 'Driver started delivery'
      });
      
     
      startLiveTracking(shipmentId);
      
      await loadAllData();
      alert('Shipment confirmed and started! Customer has been notified.');
    } catch (error) {
      console.error('Failed to start shipment:', error);
      alert('Failed to start shipment');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Transit': return 'bg-green-500/20 text-green-400';
      case 'Pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'Delivered': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'In Transit': return <Truck className="w-5 h-5" />;
      case 'Pending': return <Clock className="w-5 h-5" />;
      case 'Delivered': return <CheckCircle className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getDriverRouteUrl = () => {
    const destination = selectedShipment?.deliveryLocation || selectedShipment?.shippingAddress || selectedShipment?.pickupLocation || '';
    const origin = trackingLocation ? `${trackingLocation.lat},${trackingLocation.lng}` : '';
    const encodedDestination = encodeURIComponent(destination);

    if (origin && destination) {
      return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${encodedDestination}`;
    }
    if (destination) {
      return `https://www.google.com/maps?q=${encodedDestination}`;
    }
    return 'https://www.google.com/maps';
  };

  const statsCards = [
    { label: "Today's Deliveries", value: stats.todaysDeliveries.toString(), icon: '🚚', color: 'from-cyan-400 to-blue-500' },
    { label: 'Completed', value: stats.completedDeliveries.toString(), icon: '✅', color: 'from-green-400 to-emerald-500' },
    { label: 'Pending', value: stats.pendingDeliveries.toString(), icon: '⏳', color: 'from-yellow-400 to-orange-500' },
    { label: 'Total Distance', value: `${stats.totalDistance} km`, icon: '📍', color: 'from-purple-400 to-pink-500' },
    { label: 'On-Time Rate', value: `${stats.onTimeRate}%`, icon: '⏱️', color: 'from-blue-400 to-cyan-500' },
    { label: 'Avg Rating', value: `${stats.averageRating} ⭐`, icon: '⭐', color: 'from-yellow-400 to-amber-500' },
  ];


  const availableShipments = shipments.filter(s => 
    isAvailable ? true : s.driverId === driverId
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading your deliveries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6 bg-slate-900 min-h-screen">
     
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Driver Dashboard</h1>
          <p className="text-slate-400">Welcome back, {profile?.firstName || user?.firstName} {profile?.lastName || user?.lastName}</p>
        </div>
        <div className="flex items-center gap-4">
       
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
            isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? (syncStatus === 'syncing' ? 'Syncing...' : 'Online') : 'Offline'}
          </div>
          
          <button
            onClick={updateAvailability}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              isAvailable 
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
            {isAvailable ? 'Available' : 'Unavailable'}
          </button>
          <button
            onClick={() => setShowProfileModal(true)}
            className="p-2 hover:bg-slate-700 rounded-full transition"
          >
            <Settings className="w-5 h-5 text-slate-400" />
          </button>
          <button
            onClick={logout}
            className="p-2 hover:bg-red-500/20 rounded-full transition"
          >
            <LogOut className="w-5 h-5 text-red-400" />
          </button>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xl font-bold">
            {profile?.firstName?.[0] || user?.firstName?.[0]}{profile?.lastName?.[0] || user?.lastName?.[0]}
          </div>
        </div>
      </div>

   
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {statsCards.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <div className={`bg-gradient-to-br ${stat.color} rounded-xl p-2 text-xl`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">My Shipments</h2>
            <button onClick={loadAllData} className="p-2 hover:bg-slate-700 rounded-lg transition">
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {shipments.map((shipment) => (
              <div
                key={shipment.id}
                onClick={() => {
                  setSelectedShipment(shipment);
                  setSelectedShipmentId(shipment.id);
                }}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  selectedShipment?.id === shipment.id
                    ? 'border-cyan-500 bg-slate-700/50'
                    : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-white">{shipment.trackingNumber}</p>
                    <p className="text-sm text-slate-400 mt-1">
                      {shipment.pickupLocation || 'Warehouse'} → {shipment.deliveryLocation || 'Customer'}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs flex items-center gap-1 ${getStatusColor(shipment.status)}`}>
                    {getStatusIcon(shipment.status)} {shipment.status}
                  </span>
                </div>
                <div className="flex justify-between mt-3 text-sm">
                  <span className="text-slate-400">Distance: {shipment.distance || 'N/A'} km</span>
                  <span className="text-slate-400">ETA: {shipment.eta || 'N/A'}</span>
                </div>
                <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
                    style={{ 
                      width: shipment.status === 'Delivered' ? '100%' : 
                             shipment.status === 'In Transit' ? '60%' : '20%' 
                    }}
                  />
                </div>
              </div>
            ))}
            {shipments.length === 0 && (
              <div className="text-center py-8">
                <p className="text-4xl mb-2">🚚</p>
                <p className="text-slate-400">No shipments assigned yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedShipment && (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-white">Delivery Details</h2>
                <div className="flex gap-2">
                  {isTrackingLive && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                      Live Tracking Active
                    </span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between p-2 border-b border-slate-700">
                    <span className="text-slate-400">Tracking Number:</span>
                    <span className="text-white font-medium">{selectedShipment.trackingNumber}</span>
                  </div>
                  <div className="flex justify-between p-2 border-b border-slate-700">
                    <span className="text-slate-400">Order ID:</span>
                    <span className="text-white font-medium">#{selectedShipment.orderId}</span>
                  </div>
                  <div className="flex justify-between p-2 border-b border-slate-700">
                    <span className="text-slate-400">Pickup Location:</span>
                    <span className="text-white">{selectedShipment.pickupLocation || 'Main Warehouse'}</span>
                  </div>
                  <div className="flex justify-between p-2 border-b border-slate-700">
                    <span className="text-slate-400">Delivery Location:</span>
                    <span className="text-white">{selectedShipment.deliveryLocation || selectedShipment.shippingAddress || 'Customer Address'}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between p-2 border-b border-slate-700">
                    <span className="text-slate-400">Distance:</span>
                    <span className="text-white">{selectedShipment.distance || 'Calculating...'} km</span>
                  </div>
                  <div className="flex justify-between p-2 border-b border-slate-700">
                    <span className="text-slate-400">Estimated Delivery:</span>
                    <span className="text-white">{new Date(selectedShipment.estimatedDeliveryDate).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between p-2 border-b border-slate-700">
                    <span className="text-slate-400">Status:</span>
                    <span className={`font-medium flex items-center gap-1 ${getStatusColor(selectedShipment.status)}`}>
                      {getStatusIcon(selectedShipment.status)} {selectedShipment.status}
                    </span>
                  </div>
                  {trackingLocation && (
                    <div className="flex justify-between p-2 border-b border-slate-700">
                      <span className="text-slate-400">Current Location:</span>
                      <span className="text-white text-sm">{trackingLocation.lat?.toFixed(4)}, {trackingLocation.lng?.toFixed(4)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-6 lg:flex-row">
                {selectedShipment.status === 'Pending' && (
                  <button
                    onClick={() => startDelivery(selectedShipment.id)}
                    disabled={updating || !isAvailable}
                    className="flex-1 rounded-lg bg-green-500 px-4 py-2 text-white font-medium hover:bg-green-400 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Truck className="w-4 h-4" />
                    {updating ? 'Processing...' : 'Start Delivery'}
                  </button>
                )}
                {selectedShipment.status === 'In Transit' && !isTrackingLive && (
                  <button
                    onClick={() => startLiveTracking(selectedShipment.id)}
                    className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 text-white font-medium hover:bg-cyan-400 transition flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Start GPS Tracking
                  </button>
                )}
                {selectedShipment.status === 'In Transit' && (
                  <button
                    onClick={() => {
                      setSelectedShipmentId(selectedShipment.id);
                      setShowProofModal(true);
                    }}
                    disabled={updating}
                    className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-white font-medium hover:bg-blue-400 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {updating ? 'Processing...' : 'Complete Delivery'}
                  </button>
                )}
                <a
                  href={getDriverRouteUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 rounded-lg bg-slate-700 px-4 py-2 text-white font-medium hover:bg-slate-600 transition flex items-center justify-center gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  View Route
                </a>
                {selectedShipment.status === 'In Transit' && (
                  <button
                    onClick={sendCurrentLocationNow}
                    disabled={!trackingLocation || updating}
                    className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 text-white font-medium hover:bg-cyan-400 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Send Current Location
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1 ${syncStatus === 'synced' ? 'bg-emerald-500/10 text-emerald-300' : syncStatus === 'syncing' ? 'bg-blue-500/10 text-blue-300' : 'bg-yellow-500/10 text-amber-300'}`}>
                    {syncStatus === 'synced' ? 'Location synced' : syncStatus === 'syncing' ? 'Sending location...' : 'Offline queue'}
                  </span>
                  <span className="text-slate-400">Network: {isOnline ? 'Online' : 'Offline'}</span>
                </div>
                {trackingError && (
                  <p className="text-amber-300 text-sm">GPS issue: {trackingError}</p>
                )}
              </div>

              {selectedShipment.items && selectedShipment.items.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-700">
                  <h3 className="text-white font-semibold mb-2">Items to Deliver</h3>
                  <div className="space-y-2">
                    {selectedShipment.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm p-2 bg-slate-700/30 rounded-lg">
                        <span className="text-slate-300">Product #{item.productId}</span>
                        <span className="text-white font-medium">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
            <h2 className="text-xl font-bold text-white mb-4">Today's Schedule</h2>
            <div className="space-y-3">
              {schedule.length > 0 ? schedule.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold bg-cyan-500/20 text-cyan-400">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{item.description}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> {item.location}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-cyan-400 font-medium">{item.time}</p>
                    <p className="text-xs text-slate-500">{item.trackingNumber}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <p className="text-slate-400">No scheduled deliveries for today</p>
                  <p className="text-sm text-slate-500 mt-2">Check back tomorrow for new assignments</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {showProofModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowProofModal(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-[450px] border border-slate-700" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">Delivery Proof</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Delivery Notes / Photo URL</label>
                <textarea
                  placeholder="Add delivery notes or photo URL..."
                  value={deliveryProof}
                  onChange={(e) => setDeliveryProof(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-white h-24 resize-none focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Customer Signature (Name)</label>
                <input
                  type="text"
                  placeholder="Customer signature (name)"
                  value={deliverySignature}
                  onChange={(e) => setDeliverySignature(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <p className="text-xs text-slate-400">You can add a photo URL or customer signature as proof of delivery</p>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowProofModal(false)} className="flex-1 rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-600 transition">
                  Cancel
                </button>
                <button onClick={() => completeDelivery(selectedShipmentId!)} className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-white font-medium hover:from-cyan-400 hover:to-blue-400 transition">
                  Confirm Delivery
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

     
      {showProfileModal && profile && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowProfileModal(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-[450px] border border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Driver Profile</h2>
              <button onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            
            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-3xl font-bold mb-3">
                {profile.firstName?.[0]}{profile.lastName?.[0]}
              </div>
              <h3 className="text-lg font-semibold text-white">{profile.firstName} {profile.lastName}</h3>
              <p className="text-slate-400 text-sm">{profile.email}</p>
              <span className={`mt-2 px-3 py-1 rounded-full text-xs ${isAvailable ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {isAvailable ? 'Available' : 'Unavailable'}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                <User className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-xs text-slate-400">Driver ID</p>
                  <p className="text-white font-medium">#{profile.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                <Phone className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-xs text-slate-400">Phone Number</p>
                  <p className="text-white font-medium">{profile.phoneNumber || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                <Mail className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-xs text-slate-400">Email</p>
                  <p className="text-white font-medium">{profile.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                <Clock className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-xs text-slate-400">License Number</p>
                  <p className="text-white font-medium">{profile.licenseNumber || 'Not provided'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{stats.totalDeliveries}</p>
                <p className="text-xs text-slate-400">Total Deliveries</p>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{stats.onTimeRate}%</p>
                <p className="text-xs text-slate-400">On-Time Rate</p>
              </div>
            </div>

            <button
              onClick={() => setShowProfileModal(false)}
              className="w-full mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}