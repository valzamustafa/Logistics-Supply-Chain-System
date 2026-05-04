
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { shipmentService, Shipment } from '../services/shipmentService';

export const TrackShipment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveLocation, setLiveLocation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchShipmentDetails();
      
      const interval = setInterval(() => {
        if (shipment?.status?.toLowerCase() === 'in transit') {
          fetchLiveTracking();
        }
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [id, shipment?.status]);

  const fetchShipmentDetails = async () => {
    try {
      setLoading(true);
      const response = await shipmentService.getById(id!);
      const shipmentData = (response as any).data || response;
      setShipment(shipmentData);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load shipment details');
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveTracking = async () => {
    try {
      const response = await shipmentService.getLiveTracking(id!);
      setLiveLocation(response);
    } catch (error) {
      console.error('Failed to fetch live tracking:', error);
    }
  };

  const getTimelineSteps = () => {
    const steps = [];
    
    steps.push({
      status: 'Order Placed',
      date: shipment?.estimatedDeliveryDate,
      description: 'Your order has been confirmed',
      completed: true
    });
    
    steps.push({
      status: 'Processing',
      date: shipment?.estimatedDeliveryDate,
      description: 'Order is being prepared for shipment',
      completed: shipment?.status?.toLowerCase() !== 'pending'
    });
    
    steps.push({
      status: 'Picked Up',
      date: shipment?.estimatedDeliveryDate,
      description: 'Package picked up from warehouse',
      completed: shipment?.status?.toLowerCase() !== 'pending' && shipment?.status?.toLowerCase() !== 'processing'
    });
    
    steps.push({
      status: 'In Transit',
      date: shipment?.estimatedDeliveryDate,
      description: 'Your package is on the way',
      completed: shipment?.status?.toLowerCase() === 'in transit' || shipment?.status?.toLowerCase() === 'delivered'
    });
    
    steps.push({
      status: 'Delivered',
      date: shipment?.actualDeliveryDate,
      description: 'Package delivered successfully',
      completed: shipment?.status?.toLowerCase() === 'delivered'
    });
    
    return steps;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-slate-400">Loading shipment details...</div>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded">
          {error || 'Shipment not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Track Your Shipment</h1>
      
      <div className="bg-slate-800 rounded-lg shadow p-6 mb-8 border border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Shipment Details</h3>
            <p className="text-slate-300"><strong className="text-white">Shipment ID:</strong> {shipment.id}</p>
            <p className="text-slate-300"><strong className="text-white">Tracking Number:</strong> {shipment.trackingNumber}</p>
            <p className="text-slate-300"><strong className="text-white">Order ID:</strong> {shipment.orderId}</p>
            <p className="text-slate-300"><strong className="text-white">Status:</strong> 
              <span className={`ml-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                shipment.status?.toLowerCase() === 'delivered' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                shipment.status?.toLowerCase() === 'in transit' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              }`}>
                {shipment.status || 'Pending'}
              </span>
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Delivery Information</h3>
            <p className="text-slate-300"><strong className="text-white">Estimated Delivery:</strong> {shipment.estimatedDeliveryDate ? new Date(shipment.estimatedDeliveryDate).toLocaleDateString() : 'N/A'}</p>
            {shipment.actualDeliveryDate && (
              <p className="text-slate-300"><strong className="text-white">Actual Delivery:</strong> {new Date(shipment.actualDeliveryDate).toLocaleDateString()}</p>
            )}
            <p className="text-slate-300"><strong className="text-white">Shipping Address:</strong> {shipment.shippingAddress || 'Not specified'}</p>
          </div>
        </div>
      </div>

      {liveLocation && shipment.status?.toLowerCase() === 'in transit' && (
        <div className="bg-slate-800 rounded-lg shadow p-6 mb-8 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-3">Live Location</h3>
          <div className="bg-slate-900/50 rounded-lg p-4 text-center border border-slate-700">
            <p className="text-cyan-400">
              📍 {liveLocation.currentLocation || 'Location available soon'}
            </p>
            <p className="text-sm text-slate-400 mt-2">
              Last updated: {liveLocation.lastLocationUpdate ? new Date(liveLocation.lastLocationUpdate).toLocaleString() : 'N/A'}
            </p>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-lg shadow p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-6">Tracking Timeline</h3>
        <div className="relative">
          {getTimelineSteps().map((step, index) => (
            <div key={index} className="mb-8 flex">
              <div className="flex flex-col items-center mr-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step.completed ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-slate-700 text-slate-400 border border-slate-600'
                }`}>
                  {step.completed ? '✓' : index + 1}
                </div>
                {index < getTimelineSteps().length - 1 && (
                  <div className={`w-0.5 h-12 mt-1 ${
                    step.completed && getTimelineSteps()[index + 1].completed ? 'bg-green-500/50' : 'bg-slate-700'
                  }`} />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-white text-lg">{step.status}</h4>
                {step.date && (
                  <p className="text-sm text-slate-400">
                    {new Date(step.date).toLocaleString()}
                  </p>
                )}
                <p className="text-slate-300">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};