using ShipmentService.DTOs;
using ShipmentService.Models;

namespace ShipmentService.Services.Interfaces;

public interface IShipmentService
{
    Task<IEnumerable<Shipment>> GetAllAsync();
    Task<Shipment?> GetByIdAsync(int id);
    Task<IEnumerable<Shipment>> GetByOrderIdAsync(int orderId);
    Task<IEnumerable<Shipment>> GetByDriverIdAsync(int driverId);
    Task<Shipment> CreateAsync(CreateShipmentDto dto);
    Task<Shipment> UpdateStatusAsync(int id, string status);
    Task<Shipment?> StartDeliveryAsync(int id);
    Task<Shipment> ReorderShipmentAsync(int id, int newPriority);
    Task<Shipment?> CompleteDeliveryAsync(int id, string? proof);
}