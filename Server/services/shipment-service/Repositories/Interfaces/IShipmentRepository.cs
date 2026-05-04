using ShipmentService.Models;

namespace ShipmentService.Repositories.Interfaces;

public interface IShipmentRepository
{
    Task<IEnumerable<Shipment>> GetAllAsync();
    Task<Shipment?> GetByIdAsync(int id);
    Task<IEnumerable<Shipment>> GetByOrderIdAsync(int orderId);
    Task<IEnumerable<Shipment>> GetByDriverIdAsync(int driverId);
    Task<Shipment> CreateAsync(Shipment shipment);
    Task<Shipment> UpdateAsync(Shipment shipment);
    Task DeleteAsync(int id);
}