using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ShipmentService.Data;
using ShipmentService.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace ShipmentService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VehiclesController : ControllerBase
{
    private readonly ShipmentDbContext _context;
    private const string VehicleManagerRoles = "Admin,Manager,Warehouse,WarehouseStaff,Supplier";
    
    public VehiclesController(ShipmentDbContext context)
    {
        _context = context;
    }

    private int? CurrentUserId
    {
        get
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;
            return int.TryParse(userIdClaim, out var id) ? id : null;
        }
    }

    private async Task<Driver?> GetCurrentDriverAsync()
    {
        if (!CurrentUserId.HasValue)
            return null;

        return await _context.Drivers.FirstOrDefaultAsync(d => d.UserId == CurrentUserId.Value);
    }
    
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var vehicles = await _context.Vehicles.Include(v => v.Driver).ToListAsync();
        return Ok(vehicles);
    }
    
    [HttpGet("available")]
    public async Task<IActionResult> GetAvailable()
    {
        var vehicles = await _context.Vehicles.Where(v => v.IsAvailable && v.DriverId == null).ToListAsync();
        return Ok(vehicles);
    }

    [HttpGet("my")]
    [Authorize(Roles = "Driver")]
    public async Task<IActionResult> GetMyVehicle()
    {
        var driver = await GetCurrentDriverAsync();
        if (driver == null)
            return NotFound(new { message = "Driver profile not found" });

        var vehicle = await _context.Vehicles
            .Where(v => v.DriverId == driver.Id)
            .OrderByDescending(v => v.UpdatedAt ?? v.CreatedAt)
            .FirstOrDefaultAsync();

        if (vehicle == null)
            return NotFound(new { message = "No vehicle assigned to this driver" });

        return Ok(vehicle);
    }
    
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var vehicle = await _context.Vehicles.FindAsync(id);
        if (vehicle == null)
            return NotFound();
        return Ok(vehicle);
    }

    [HttpGet("{id:int}/tracking/live")]
    public async Task<IActionResult> GetLiveTracking(int id)
    {
        var vehicle = await _context.Vehicles
            .Include(v => v.Driver)
            .FirstOrDefaultAsync(v => v.Id == id);

        if (vehicle == null)
            return NotFound(new { message = "Vehicle not found" });

        var activeStatuses = new[] { "In Transit", "Out for Delivery" };
        var query = _context.Shipments
            .Include(s => s.Driver)
            .Where(s => s.VehicleId == vehicle.Id || (vehicle.DriverId.HasValue && s.DriverId == vehicle.DriverId.Value));

        var shipment = await query
            .OrderByDescending(s => activeStatuses.Contains(s.Status))
            .ThenByDescending(s => s.LastLocationUpdate ?? s.UpdatedAt ?? s.CreatedAt)
            .FirstOrDefaultAsync();

        var driverName = vehicle.DriverId.HasValue ? $"Driver #{vehicle.DriverId}" : "Not assigned";
        var driverPhone = "N/A";

        if (shipment?.Driver != null)
        {
            driverName = $"Driver #{shipment.Driver.Id}";
            driverPhone = shipment.Driver.PhoneNumber ?? "N/A";
        }
        else if (vehicle.Driver != null)
        {
            driverName = $"Driver #{vehicle.Driver.Id}";
            driverPhone = vehicle.Driver.PhoneNumber ?? "N/A";
        }

        if (shipment == null)
        {
            return Ok(new
            {
                VehicleId = vehicle.Id,
                vehicle.PlateNumber,
                vehicle.Model,
                ShipmentId = (int?)null,
                TrackingNumber = (string?)null,
                CurrentLocation = (string?)null,
                LastLocationUpdate = (DateTime?)null,
                Status = "No assigned shipment",
                EstimatedDeliveryDate = (DateTime?)null,
                Destination = (string?)null,
                DriverName = driverName,
                DriverPhone = driverPhone
            });
        }

        return Ok(new
        {
            VehicleId = vehicle.Id,
            vehicle.PlateNumber,
            vehicle.Model,
            ShipmentId = shipment.Id,
            shipment.TrackingNumber,
            shipment.CurrentLocation,
            shipment.LastLocationUpdate,
            shipment.Status,
            shipment.EstimatedDeliveryDate,
            Destination = shipment.DeliveryLocation ?? shipment.ShippingAddress,
            DriverName = driverName,
            DriverPhone = driverPhone
        });
    }
    
    [HttpGet("driver/{driverId}")]
    public async Task<IActionResult> GetByDriver(int driverId)
    {
        var vehicle = await _context.Vehicles
            .Where(v => v.DriverId == driverId)
            .OrderByDescending(v => v.UpdatedAt ?? v.CreatedAt)
            .FirstOrDefaultAsync();

        if (vehicle == null)
            return NotFound();

        return Ok(vehicle);
    }

    [HttpPost]
    [Authorize(Roles = VehicleManagerRoles)]
    public async Task<IActionResult> Create([FromBody] VehicleUpsertDto dto)
    {
        var vehicle = new Vehicle();
        await ApplyVehicleDtoAsync(vehicle, dto);
        _context.Vehicles.Add(vehicle);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = vehicle.Id }, vehicle);
    }

    [HttpPost("my")]
    [Authorize(Roles = "Driver")]
    public async Task<IActionResult> CreateMyVehicle([FromBody] VehicleUpsertDto dto)
    {
        var driver = await GetCurrentDriverAsync();
        if (driver == null)
            return NotFound(new { message = "Driver profile not found" });

        var vehicle = new Vehicle { DriverId = driver.Id };
        await ApplyVehicleDtoAsync(vehicle, dto);
        _context.Vehicles.Add(vehicle);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = vehicle.Id }, vehicle);
    }
    
    [HttpPut("{id:int}")]
    [Authorize(Roles = VehicleManagerRoles)]
    public async Task<IActionResult> Update(int id, [FromBody] VehicleUpsertDto dto)
    {
        var existing = await _context.Vehicles.FindAsync(id);
        if (existing == null)
            return NotFound();

        await ApplyVehicleDtoAsync(existing, dto);
        existing.UpdatedAt = DateTime.UtcNow;
        
        _context.Vehicles.Update(existing);
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpPut("my/{id}")]
    [Authorize(Roles = "Driver")]
    public async Task<IActionResult> UpdateMyVehicle(int id, [FromBody] VehicleUpsertDto dto)
    {
        var driver = await GetCurrentDriverAsync();
        if (driver == null)
            return NotFound(new { message = "Driver profile not found" });

        var existing = await _context.Vehicles.FirstOrDefaultAsync(v => v.Id == id && v.DriverId == driver.Id);
        if (existing == null)
            return NotFound(new { message = "Vehicle not found for this driver" });

        await ApplyVehicleDtoAsync(existing, dto);
        existing.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpPost("assign")]
    [Authorize(Roles = VehicleManagerRoles)]
    public async Task<IActionResult> AssignToDriver([FromBody] AssignVehicleToDriverDto dto)
    {
        var driver = await _context.Drivers.FindAsync(dto.DriverId);
        var vehicle = await _context.Vehicles.FindAsync(dto.VehicleId);

        if (driver == null || vehicle == null)
            return NotFound(new { message = "Driver or vehicle not found" });

        vehicle.DriverId = driver.Id;
        vehicle.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(vehicle);
    }
    
    [HttpDelete("{id:int}")]
    [Authorize(Roles = VehicleManagerRoles)]
    public async Task<IActionResult> Delete(int id)
    {
        var vehicle = await _context.Vehicles.FindAsync(id);
        if (vehicle == null)
            return NotFound();
            
        _context.Vehicles.Remove(vehicle);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("my/{id}")]
    [Authorize(Roles = "Driver")]
    public async Task<IActionResult> DeleteMyVehicle(int id)
    {
        var driver = await GetCurrentDriverAsync();
        if (driver == null)
            return NotFound(new { message = "Driver profile not found" });

        var vehicle = await _context.Vehicles.FirstOrDefaultAsync(v => v.Id == id && v.DriverId == driver.Id);
        if (vehicle == null)
            return NotFound();

        _context.Vehicles.Remove(vehicle);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static Task ApplyVehicleDtoAsync(Vehicle vehicle, VehicleUpsertDto dto)
    {
        vehicle.PlateNumber = dto.PlateNumber?.Trim().ToUpperInvariant() ?? string.Empty;
        vehicle.Model = dto.Model?.Trim() ?? string.Empty;
        vehicle.Capacity = dto.Capacity;
        vehicle.IsAvailable = dto.IsAvailable;
        vehicle.VehicleType = string.IsNullOrWhiteSpace(dto.VehicleType) ? "truck" : dto.VehicleType.Trim().ToLowerInvariant();
        vehicle.Year = dto.Year;
        vehicle.Color = string.IsNullOrWhiteSpace(dto.Color) ? null : dto.Color.Trim();
        vehicle.ImageUrl = string.IsNullOrWhiteSpace(dto.ImageUrl) ? null : dto.ImageUrl;

        return Task.CompletedTask;
    }
}

public class VehicleUpsertDto
{
    public string? PlateNumber { get; set; }
    public string? Model { get; set; }
    public int Capacity { get; set; }
    public bool IsAvailable { get; set; } = true;
    public string? VehicleType { get; set; }
    public int? Year { get; set; }
    public string? Color { get; set; }
    public string? ImageUrl { get; set; }
}

public class AssignVehicleToDriverDto
{
    public int DriverId { get; set; }
    public int VehicleId { get; set; }
}
