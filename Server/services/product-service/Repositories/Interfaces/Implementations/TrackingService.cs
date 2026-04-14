using TrackingService.DTOs;
using TrackingService.Models;
using TrackingService.Repositories.Interfaces;
using TrackingService.Services.Interfaces;

namespace TrackingService.Business
{
    public class TrackingService : ITrackingService
    {
        private readonly ITrackingRepository _repository;

        public TrackingService(ITrackingRepository repository)
        {
            _repository = repository;
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
