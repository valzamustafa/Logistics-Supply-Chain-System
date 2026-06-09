using Microsoft.Extensions.Logging;
using ShipmentService.DTOs;
using ShipmentService.Models;
using ShipmentService.Repositories.Interfaces;
using ShipmentService.Services.Interfaces;
using BuildingBlocks;

namespace ShipmentService.Services;

public class ShipmentServices : IShipmentService
{
    private readonly IShipmentRepository _shipmentRepository;
    private readonly IDriverRepository _driverRepository;
    private readonly IVehicleRepository _vehicleRepository;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly INotificationClient _notificationClient;
    private readonly ILogger<ShipmentServices> _logger;

    public ShipmentServices(
        IShipmentRepository shipmentRepository, 
        IDriverRepository driverRepository,
        IVehicleRepository vehicleRepository,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        INotificationClient notificationClient,
        ILogger<ShipmentServices> logger)
    {
        _shipmentRepository = shipmentRepository;
        _driverRepository = driverRepository;
        _vehicleRepository = vehicleRepository;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _notificationClient = notificationClient;
        _logger = logger;
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
    _logger.LogInformation("CreateAsync started: OrderId={OrderId}, DriverId={DriverId}, Items={ItemCount}", 
        dto.OrderId, dto.DriverId, dto.Items?.Count ?? 0);

    

    try
    {
        var shipment = new Shipment
        {
            TrackingNumber = GenerateTrackingNumber(),
            OrderId = dto.OrderId,
            PurchaseOrderId = dto.PurchaseOrderId,
            DriverId = dto.DriverId,
            VehicleId = dto.VehicleId,
            Status = "Pending",
            EstimatedDeliveryDate = dto.EstimatedDeliveryDate,
            ShippingAddress = dto.ShippingAddress,
            CreatedAt = DateTime.UtcNow,
            Priority = 1,
            InventoryDeducted = false
        };
        
        _logger.LogInformation("Shipment object created: TrackingNumber={TrackingNumber}, Status={Status}", 
            shipment.TrackingNumber, shipment.Status);
        
        if (dto.Items != null)
        {
            foreach (var item in dto.Items)
            {
                shipment.Items.Add(new ShipmentItem
                {
                    ProductId = item.ProductId,
                    Quantity = item.Quantity
                });
            }
        }
        
        _logger.LogInformation("Adding {ItemCount} items to shipment", shipment.Items.Count);
        
        if (dto.DriverId.HasValue)
        {
            _logger.LogInformation("Validating driver availability: DriverId={DriverId}", dto.DriverId.Value);
            var driver = await _driverRepository.GetByIdAsync(dto.DriverId.Value);
            if (driver == null)
            {
                _logger.LogWarning("Driver {DriverId} not found", dto.DriverId.Value);
                throw new InvalidOperationException($"Driver with id {dto.DriverId.Value} does not exist.");
            }

            if (!driver.IsAvailable)
            {
                _logger.LogWarning("Driver {DriverId} is not available", dto.DriverId.Value);
                throw new InvalidOperationException($"Driver with id {dto.DriverId.Value} is not available.");
            }

            driver.IsAvailable = false;
            await _driverRepository.UpdateAsync(driver);
            _logger.LogInformation("Driver {DriverId} marked as unavailable", dto.DriverId.Value);
        }

        if (dto.VehicleId.HasValue)
        {
            _logger.LogInformation("Validating vehicle availability: VehicleId={VehicleId}", dto.VehicleId.Value);
            var vehicle = await _vehicleRepository.GetByIdAsync(dto.VehicleId.Value);
            if (vehicle == null)
            {
                _logger.LogWarning("Vehicle {VehicleId} not found", dto.VehicleId.Value);
                throw new InvalidOperationException($"Vehicle with id {dto.VehicleId.Value} does not exist.");
            }

            if (!vehicle.IsAvailable)
            {
                _logger.LogWarning("Vehicle {VehicleId} is not available", dto.VehicleId.Value);
                throw new InvalidOperationException($"Vehicle with id {dto.VehicleId.Value} is not available.");
            }

            vehicle.IsAvailable = false;
            await _vehicleRepository.UpdateAsync(vehicle);
            _logger.LogInformation("Vehicle {VehicleId} marked as unavailable", dto.VehicleId.Value);
        }

        var created = await _shipmentRepository.CreateAsync(shipment);
        _logger.LogInformation("Shipment saved to repository: Id={ShipmentId}", created.Id);

       
        try
        {
            _logger.LogInformation("Sending warehouse notification for shipment {ShipmentId}", created.Id);
            await _notificationClient.SendNotificationToRoleAsync(
                "Warehouse",
                "ShipmentCreated",
                "New Shipment Created",
                $"Shipment #{created.Id} for Order {created.OrderId} has been created. Status: {created.Status}.",
                $"/shipments/{created.Id}"
            );
            _logger.LogInformation("Warehouse notification sent successfully");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send warehouse notification for shipment {ShipmentId}", created.Id);
        }
        
        try
        {
            _logger.LogInformation("Sending driver notification for shipment {ShipmentId}", created.Id);
            await _notificationClient.SendNotificationToRoleAsync(
                "Driver",
                "ShipmentCreated",
                "New Shipment Available",
                $"A new shipment is ready for delivery. Order: {created.OrderId}.",
                $"/driver/shipments"
            );
            _logger.LogInformation("Driver notification sent successfully");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send driver notification for shipment {ShipmentId}", created.Id);
        }
        
        _logger.LogInformation("CreateAsync completed successfully: ShipmentId={ShipmentId}", created.Id);
        return created;
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Fatal error in CreateAsync: {Message}", ex.Message);
        throw;
    }
}
    
public async Task<Shipment> UpdateStatusAsync(int id, string status)
    {
        var shipment = await _shipmentRepository.GetByIdAsync(id);
        if (shipment == null)
            throw new Exception("Shipment not found");
            
        var previousStatus = shipment.Status;
        shipment.Status = status;
        shipment.UpdatedAt = DateTime.UtcNow;
        
        if (status.Equals("Delivered", StringComparison.OrdinalIgnoreCase))
        {
            shipment.ActualDeliveryDate = DateTime.UtcNow;
            
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
        var shipment = await UpdateStatusAsync(id, "In Transit");

        try
        {
            await _notificationClient.SendNotificationToRoleAsync(
                "Manager",
                "DeliveryStarted",
                "Delivery in Progress",
                $"Shipment #{shipment.Id} for Order {shipment.OrderId} delivery has been started.",
                $"/shipments/{shipment.Id}"
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send delivery started notification for shipment {ShipmentId}", shipment.Id);
        }

        return shipment;
    }
    
    public async Task<Shipment?> CompleteDeliveryAsync(int id, string? proof)
    {
        var shipment = await UpdateStatusAsync(id, "Delivered");

        try
        {
            await _notificationClient.SendNotificationToRoleAsync(
                "Manager",
                "DeliveryCompleted",
                "Delivery Completed",
                $"Shipment #{shipment.Id} for Order {shipment.OrderId} has been successfully delivered.",
                $"/shipments/{shipment.Id}"
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send delivery completed manager notification for shipment {ShipmentId}", shipment.Id);
        }

        try
        {
            await _notificationClient.SendNotificationToRoleAsync(
                "Warehouse",
                "DeliveryCompleted",
                "Delivery Completed",
                $"Shipment #{shipment.Id} delivery is complete.",
                $"/shipments/{shipment.Id}"
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send delivery completed warehouse notification for shipment {ShipmentId}", shipment.Id);
        }

        return shipment;
    }

    public async Task<Shipment> AssignDriverAsync(int id, int driverId)
    {
        var shipment = await _shipmentRepository.GetByIdAsync(id);
        if (shipment == null)
            throw new Exception("Shipment not found");

        shipment.DriverId = driverId;
        shipment.UpdatedAt = DateTime.UtcNow;

        var driver = await _driverRepository.GetByIdAsync(driverId);
        if (driver != null)
        {
            driver.IsAvailable = false;
            await _driverRepository.UpdateAsync(driver);
        }

        try
        {
            await _notificationClient.SendNotificationToRoleAsync(
                "Driver",
                "ShipmentAssigned",
                "New Shipment Assigned",
                $"Shipment #{shipment.Id} has been assigned to you. Order: {shipment.OrderId}.",
                $"/driver/shipments/{shipment.Id}"
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send driver assignment notification for shipment {ShipmentId}", shipment.Id);
        }

        return await _shipmentRepository.UpdateAsync(shipment);
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

    public async Task<Shipment> UpdateLocationAsync(int id, double lat, double lng)
    {
        var shipment = await _shipmentRepository.GetByIdAsync(id);
        if (shipment == null)
            throw new Exception("Shipment not found");
        
        shipment.CurrentLocation = $"{lat},{lng}";
        shipment.LastLocationUpdate = DateTime.UtcNow;
        shipment.UpdatedAt = DateTime.UtcNow;
        
        return await _shipmentRepository.UpdateAsync(shipment);
    }

    private string GenerateTrackingNumber()
    {
        return $"TRK-{DateTime.Now.Ticks.ToString().Substring(8, 8)}-{new Random().Next(100, 999)}";
    }
}