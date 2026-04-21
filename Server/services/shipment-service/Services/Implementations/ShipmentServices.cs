using ShipmentService.DTOs;
using ShipmentService.Models;
using ShipmentService.Repositories.Interfaces;
using ShipmentService.Services.Interfaces;

namespace ShipmentService.Services;

public class ShipmentServices : IShipmentService
{
    private readonly IShipmentRepository _shipmentRepository;
    private readonly IDriverRepository _driverRepository;
    private readonly IVehicleRepository _vehicleRepository;
    
    public ShipmentServices(
        IShipmentRepository shipmentRepository, 
        IDriverRepository driverRepository,
        IVehicleRepository vehicleRepository)
    {
        _shipmentRepository = shipmentRepository;
        _driverRepository = driverRepository;
        _vehicleRepository = vehicleRepository;
    }
    
    public async Task<IEnumerable<Shipment>> GetAllAsync()
    {
        return await _shipmentRepository.GetAllAsync();
    }
    
    public async Task<Shipment?> GetByIdAsync(int id)
    {
        return await _shipmentRepository.GetByIdAsync(id);
    }
    
    public async Task<IEnumerable<Shipment>> GetByOrderIdAsync(int orderId)
    {
        return await _shipmentRepository.GetByOrderIdAsync(orderId);
    }
    
    public async Task<IEnumerable<Shipment>> GetByDriverIdAsync(int driverId)
    {
        return await _shipmentRepository.GetByDriverIdAsync(driverId);
    }
    
    public async Task<Shipment> CreateAsync(CreateShipmentDto dto)
    {
        var shipment = new Shipment
        {
            TrackingNumber = GenerateTrackingNumber(),
            OrderId = dto.OrderId,
            DriverId = dto.DriverId,
            VehicleId = dto.VehicleId,
            Status = "Pending",
            EstimatedDeliveryDate = dto.EstimatedDeliveryDate,
            ShippingAddress = dto.ShippingAddress,
            CreatedAt = DateTime.UtcNow,
            Priority = 1
        };
        
        foreach (var item in dto.Items)
        {
            shipment.Items.Add(new ShipmentItem
            {
                ProductId = item.ProductId,
                Quantity = item.Quantity
            });
        }
        
        var created = await _shipmentRepository.CreateAsync(shipment);
        
        // Update driver and vehicle availability
        if (dto.DriverId.HasValue)
        {
            var driver = await _driverRepository.GetByIdAsync(dto.DriverId.Value);
            if (driver != null)
            {
                driver.IsAvailable = false;
                await _driverRepository.UpdateAsync(driver);
            }
        }
        
        if (dto.VehicleId.HasValue)
        {
            var vehicle = await _vehicleRepository.GetByIdAsync(dto.VehicleId.Value);
            if (vehicle != null)
            {
                vehicle.IsAvailable = false;
                await _vehicleRepository.UpdateAsync(vehicle);
            }
        }
        
        return created;
    }
    
    public async Task<Shipment> UpdateStatusAsync(int id, string status)
    {
        var shipment = await _shipmentRepository.GetByIdAsync(id);
        if (shipment == null)
            throw new Exception("Shipment not found");
            
        shipment.Status = status;
        shipment.UpdatedAt = DateTime.UtcNow;
        
        if (status.Equals("Delivered", StringComparison.OrdinalIgnoreCase))
        {
            shipment.ActualDeliveryDate = DateTime.UtcNow;
            
            // Free up driver and vehicle
            if (shipment.DriverId.HasValue)
            {
                var driver = await _driverRepository.GetByIdAsync(shipment.DriverId.Value);
                if (driver != null)
                {
                    driver.IsAvailable = true;
                    await _driverRepository.UpdateAsync(driver);
                }
            }
            
            if (shipment.VehicleId.HasValue)
            {
                var vehicle = await _vehicleRepository.GetByIdAsync(shipment.VehicleId.Value);
                if (vehicle != null)
                {
                    vehicle.IsAvailable = true;
                    await _vehicleRepository.UpdateAsync(vehicle);
                }
            }
        }
        
        return await _shipmentRepository.UpdateAsync(shipment);
    }
    
    public async Task<Shipment?> StartDeliveryAsync(int id)
    {
        return await UpdateStatusAsync(id, "In Transit");
    }
    
    public async Task<Shipment?> CompleteDeliveryAsync(int id, string? proof)
    {
        return await UpdateStatusAsync(id, "Delivered");
    }
    
    public async Task<Shipment> ReorderShipmentAsync(int id, int newPriority)
    {
        var shipment = await _shipmentRepository.GetByIdAsync(id);
        if (shipment == null)
            throw new Exception("Shipment not found");
            
        shipment.Priority = newPriority;
        shipment.UpdatedAt = DateTime.UtcNow;
        
        return await _shipmentRepository.UpdateAsync(shipment);
    }
    
    private string GenerateTrackingNumber()
    {
        return $"TRK-{DateTime.Now.Ticks.ToString().Substring(8, 8)}-{new Random().Next(100, 999)}";
    }
}
