using TrackingService.DTOs;

namespace TrackingService.Services.Interfaces
{
    public interface ITrackingService
    {
        Task<TrackingDto?> GetByShipmentIdAsync(int shipmentId);
        Task<IEnumerable<TrackingDto>> GetAllAsync();
        Task<TrackingDto> CreateTrackingAsync(CreateTrackingDto dto);
        Task<TrackingDto> UpdateStatusAsync(int shipmentId, UpdateTrackingStatusDto dto);
        Task<TrackingDto> MarkAsDeliveredAsync(int shipmentId, MarkAsDeliveredDto dto);
    }
}
