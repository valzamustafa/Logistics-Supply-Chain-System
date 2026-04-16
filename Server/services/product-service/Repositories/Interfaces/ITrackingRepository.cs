using TrackingService.Models;

namespace TrackingService.Repositories.Interfaces
{
    public interface ITrackingRepository
    {
        Task<Tracking?> GetByIdAsync(int id);
        Task<Tracking?> GetByShipmentIdAsync(int shipmentId);
        Task<IEnumerable<Tracking>> GetAllAsync();
        Task<Tracking> CreateAsync(Tracking tracking);
        Task<Tracking> UpdateAsync(Tracking tracking);
        Task<bool> ExistsByShipmentIdAsync(int shipmentId);
    }
}