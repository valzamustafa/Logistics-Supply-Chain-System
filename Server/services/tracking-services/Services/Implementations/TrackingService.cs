using TrackingService.DTOs;
using TrackingService.Models;
using TrackingService.Repositories.Interfaces;
using TrackingService.Services.Interfaces;
using BuildingBlocks;

namespace TrackingService.Business
{
    public class TrackingService : ITrackingService
    {
        private readonly ITrackingRepository _repository;
        private readonly INotificationClient _notificationClient;

        public TrackingService(ITrackingRepository repository, INotificationClient notificationClient)
        {
            _repository = repository;
            _notificationClient = notificationClient;
        }

        public async Task<TrackingDto?> GetByShipmentIdAsync(int shipmentId)
        {
            var tracking = await _repository.GetByShipmentIdAsync(shipmentId);
            return tracking == null ? null : MapToDto(tracking);
        }

        public async Task<IEnumerable<TrackingDto>> GetAllAsync()
        {
            var trackings = await _repository.GetAllAsync();
            return trackings.Select(MapToDto);
        }

        public async Task<TrackingDto> CreateTrackingAsync(CreateTrackingDto dto)
        {
            if (await _repository.ExistsByShipmentIdAsync(dto.ShipmentId))
                throw new InvalidOperationException("Tracking already exists for this shipment");

            var tracking = new Tracking
            {
                ShipmentId = dto.ShipmentId,
                CurrentStatus = "Pending",
                EstimatedDeliveryDate = dto.EstimatedDeliveryDate,
                LastUpdateTime = DateTime.UtcNow,
                CreatedBy = 1,
                UpdatedBy = 1
            };

            var created = await _repository.CreateAsync(tracking);

            await _notificationClient.SendNotificationToRoleAsync(
                "Manager",
                "TrackingCreated",
                "Shipment Tracking Started",
                $"Tracking initiated for Shipment {dto.ShipmentId}. Current status: {tracking.CurrentStatus}.",
                $"/tracking/shipment/{dto.ShipmentId}"
            );

            return MapToDto(created);
        }

        public async Task<TrackingDto> UpdateStatusAsync(int shipmentId, UpdateTrackingStatusDto dto)
        {
            var tracking = await _repository.GetByShipmentIdAsync(shipmentId);
            if (tracking == null)
                throw new InvalidOperationException("Tracking not found for this shipment");

            tracking.CurrentStatus = dto.Status;
            tracking.CurrentLocation = dto.Location;
            tracking.LastUpdateTime = DateTime.UtcNow;
            tracking.UpdatedAt = DateTime.UtcNow;

            var updated = await _repository.UpdateAsync(tracking);

            await _notificationClient.SendNotificationToRoleAsync(
                "Manager",
                "TrackingStatusUpdated",
                "Tracking Status Updated",
                $"Shipment {shipmentId} status: {dto.Status}. Location: {dto.Location}.",
                $"/tracking/shipment/{shipmentId}"
            );

            await _notificationClient.SendNotificationToRoleAsync(
                "Customer",
                "ShipmentTrackingUpdate",
                "Your Shipment is on the Way",
                $"Your shipment status: {dto.Status}. {dto.Location}.",
                $"/tracking/{shipmentId}"
            );

            return MapToDto(updated);
        }

        public async Task<TrackingDto> MarkAsDeliveredAsync(int shipmentId, MarkAsDeliveredDto dto)
        {
            var tracking = await _repository.GetByShipmentIdAsync(shipmentId);
            if (tracking == null)
                throw new InvalidOperationException("Tracking not found for this shipment");

            tracking.CurrentStatus = "Delivered";
            tracking.CurrentLocation = dto.Location;
            tracking.ActualDeliveryDate = dto.ActualDeliveryDate;
            tracking.LastUpdateTime = DateTime.UtcNow;
            tracking.UpdatedAt = DateTime.UtcNow;

            var updated = await _repository.UpdateAsync(tracking);

            await _notificationClient.SendNotificationToRoleAsync(
                "Manager",
                "ShipmentDelivered",
                "Shipment Delivered",
                $"Shipment {shipmentId} has been delivered. Delivery location: {dto.Location}.",
                $"/tracking/shipment/{shipmentId}"
            );

            await _notificationClient.SendNotificationToRoleAsync(
                "Customer",
                "DeliveryConfirmed",
                "Your Package Delivered",
                $"Your shipment has been successfully delivered. Delivered at: {dto.ActualDeliveryDate}.",
                "/myorders"
            );

            return MapToDto(updated);
        }

        private TrackingDto MapToDto(Tracking tracking)
        {
            return new TrackingDto
            {
                Id = tracking.Id,
                ShipmentId = tracking.ShipmentId,
                CurrentStatus = tracking.CurrentStatus,
                CurrentLocation = tracking.CurrentLocation,
                LastUpdateTime = tracking.LastUpdateTime,
                EstimatedDeliveryDate = tracking.EstimatedDeliveryDate,
                ActualDeliveryDate = tracking.ActualDeliveryDate
            };
        }
    }
}