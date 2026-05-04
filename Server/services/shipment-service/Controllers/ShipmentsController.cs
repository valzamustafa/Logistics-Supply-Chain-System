using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using ShipmentService.DTOs;
using ShipmentService.Services.Interfaces;
using ShipmentService.Repositories.Interfaces;
using System.Net.Http;
using System.Text;
using System.Text.Json;

namespace ShipmentService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ShipmentsController : ControllerBase
{
    private readonly IShipmentService _shipmentService;
    private readonly IDriverRepository _driverRepository;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ShipmentsController> _logger;
    private readonly IConfiguration _configuration;
    
    public ShipmentsController(
        IShipmentService shipmentService, 
        IDriverRepository driverRepository,
        IHttpClientFactory httpClientFactory,
        ILogger<ShipmentsController> logger,
        IConfiguration configuration)
    {
        _shipmentService = shipmentService;
        _driverRepository = driverRepository;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _configuration = configuration;
    }
    
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var shipments = await _shipmentService.GetAllAsync();
        return Ok(shipments);
    }
    
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var shipment = await _shipmentService.GetByIdAsync(id);
        if (shipment == null)
            return NotFound();
        return Ok(shipment);
    }
    
    [HttpGet("order/{orderId}")]
    public async Task<IActionResult> GetByOrderId(int orderId)
    {
        var shipments = await _shipmentService.GetByOrderIdAsync(orderId);
        return Ok(shipments);
    }
    
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateShipmentDto request)
    {
        if (!HasShipmentPermission())
            return Forbid();

        var shipment = await _shipmentService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = shipment.Id }, shipment);
    }
    
    [Authorize(Roles = "Driver")]
    [HttpGet("driver/assigned")]
    public async Task<IActionResult> GetDriverShipments()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                          ?? User.FindFirst("sub")?.Value;
                          
        if (string.IsNullOrEmpty(userIdClaim))
            return Unauthorized();
            
        var userId = int.Parse(userIdClaim);
        var driver = await _driverRepository.GetByUserIdAsync(userId);
        
        if (driver == null)
            return NotFound(new { message = "No driver profile found for this user" });
            
        var shipments = await _shipmentService.GetByDriverIdAsync(driver.Id);
        return Ok(shipments);
    }
    
    [Authorize(Roles = "Driver")]
    [HttpPost("{id}/start")]
    public async Task<IActionResult> StartDelivery(int id)
    {
        var shipment = await _shipmentService.StartDeliveryAsync(id);
        if (shipment == null)
            return NotFound();
        return Ok(shipment);
    }
    
    [Authorize(Roles = "Driver")]
    [HttpPost("{id}/complete")]
    public async Task<IActionResult> CompleteDelivery(int id, [FromBody] CompleteDeliveryDto dto)
    {
        var shipment = await _shipmentService.CompleteDeliveryAsync(id, dto.Proof);
        if (shipment == null)
            return NotFound();
        return Ok(shipment);
    }
    
    [HttpPut("{id}/status")]
    [Authorize(Roles = "Admin,Manager,Driver")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateShipmentStatusDto request)
    {
        try
        {
    
            var shipmentModel = await _shipmentService.UpdateStatusAsync(id, request.Status);
            
            if (shipmentModel == null)
                return NotFound(new { message = "Shipment not found" });
            
        
            await UpdateSupplierPurchaseOrderStatus(shipmentModel, request);
            
            return Ok(shipmentModel);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating shipment status for ID: {ShipmentId}", id);
            return StatusCode(500, new { message = "Error updating shipment status", error = ex.Message });
        }
    }

    private async Task UpdateSupplierPurchaseOrderStatus(ShipmentService.Models.Shipment shipment, UpdateShipmentStatusDto request)
    {
        try
        {
          
            var supplierApiUrl = _configuration["Services:SupplierService"] ?? "http://localhost:5000";
            var endpoint = $"{supplierApiUrl}/api/purchaseorders/{shipment.OrderId}/confirm-shipment";
            
            var updateData = new
            {
                actualDeliveryDate = request.Status == "Delivered" ? DateTime.UtcNow : (DateTime?)null,
                notes = $"Shipment {shipment.TrackingNumber} status updated to {request.Status}. Location: {request.Location ?? "Warehouse"}. {request.Notes ?? ""}",
                trackingNumber = shipment.TrackingNumber,
                location = request.Location
            };
            
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Internal-Request", "true");
            client.Timeout = TimeSpan.FromSeconds(10);
            
            var content = new StringContent(
                JsonSerializer.Serialize(updateData),
                Encoding.UTF8,
                "application/json");
            
            var response = await client.PostAsync(endpoint, content);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Failed to update supplier order for shipment {TrackingNumber}. Status: {StatusCode}, Error: {Error}", 
                    shipment.TrackingNumber, response.StatusCode, errorBody);
            }
            else
            {
                var responseBody = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("Successfully updated supplier order for shipment {TrackingNumber} to status {Status}. Response: {Response}", 
                    shipment.TrackingNumber, request.Status, responseBody);
            }
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP error when updating supplier order for shipment {TrackingNumber}", shipment.TrackingNumber);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating supplier purchase order for shipment {TrackingNumber}", shipment.TrackingNumber);
        }
    }

    [Authorize(Roles = "Driver")]
    [HttpPut("{id}/location")]
    public async Task<IActionResult> UpdateLocation(int id, [FromBody] UpdateLocationDto dto)
    {
        try
        {
            var updated = await _shipmentService.UpdateLocationAsync(id, dto.Lat, dto.Lng);
            return Ok(updated);
        }
        catch (Exception ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Driver,Supplier,Admin")]
    [HttpGet("{id}/tracking/live")]
    public async Task<IActionResult> GetLiveTracking(int id)
    {
        var shipment = await _shipmentService.GetByIdAsync(id);
        if (shipment == null)
            return NotFound();
        
        return Ok(new
        {
            shipment.TrackingNumber,
            shipment.CurrentLocation,
            shipment.LastLocationUpdate,
            shipment.Status,
            shipment.EstimatedDeliveryDate,
            DriverName = shipment.DriverId.HasValue ? $"Driver #{shipment.DriverId}" : "Not assigned",
            DriverPhone = "N/A"
        });
    }

    [Authorize(Roles = "Driver")]
    [HttpGet("performance")]
    public async Task<IActionResult> GetPerformanceStats()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdClaim))
            return Unauthorized();
            
        var userId = int.Parse(userIdClaim);
        var driver = await _driverRepository.GetByUserIdAsync(userId);
        if (driver == null)
            return NotFound();
        
        var shipments = await _shipmentService.GetByDriverIdAsync(driver.Id);
        var shipmentsList = shipments.ToList();
        var completed = shipmentsList.Count(s => s.Status == "Delivered");
        var onTime = shipmentsList.Count(s => s.ActualDeliveryDate <= s.EstimatedDeliveryDate);
        
        return Ok(new
        {
            TotalDeliveries = shipmentsList.Count,
            CompletedDeliveries = completed,
            PendingDeliveries = shipmentsList.Count(s => s.Status == "Pending"),
            OnTimeRate = shipmentsList.Count > 0 ? (int)((double)onTime / shipmentsList.Count * 100) : 0,
            AverageRating = 0,
            TotalDistance = shipmentsList.Sum(s => s.Distance ?? 0)
        });
    }

[HttpPost("{id}/notify-supplier")]
[Authorize(Roles = "Admin,Manager,Driver")]
public async Task<IActionResult> NotifySupplier(int id, [FromBody] NotifySupplierDto request)
{
    try
    {
        var shipment = await _shipmentService.GetByIdAsync(id);
        if (shipment == null)
            return NotFound();
        
   
        var supplierApiUrl = _configuration["Services:SupplierService"] ?? "http://localhost:5000";
        var endpoint = $"{supplierApiUrl}/api/purchaseorders/{shipment.OrderId}/confirm-shipment";
        
        var updateData = new
        {
            actualDeliveryDate = request.Status == "Delivered" ? DateTime.UtcNow : (DateTime?)null,
            notes = $"Driver updated status to {request.Status}. Location: {request.Location}. Notes: {request.Notes}. Updated by: {request.UpdatedBy}",
            trackingNumber = shipment.TrackingNumber,
            location = request.Location
        };
        
        var client = _httpClientFactory.CreateClient();
        var content = new StringContent(JsonSerializer.Serialize(updateData), Encoding.UTF8, "application/json");
        var response = await client.PostAsync(endpoint, content);
        
        if (response.IsSuccessStatusCode)
        {
            _logger.LogInformation("Supplier notified for shipment {TrackingNumber} status: {Status}", 
                shipment.TrackingNumber, request.Status);
        }
        
        return Ok(new { success = true, message = "Supplier notified" });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error notifying supplier for shipment {ShipmentId}", id);
        return StatusCode(500, new { success = false, message = ex.Message });
    }
}

public class NotifySupplierDto
{
    public string Status { get; set; } = string.Empty;
    public string? Location { get; set; }
    public string? Notes { get; set; }
    public string? UpdatedBy { get; set; }
}
    [HttpPut("{id}/assign-driver")]
    public async Task<IActionResult> AssignDriver(int id, [FromBody] AssignDriverDto request)
    {
        if (!HasShipmentPermission())
            return Forbid();

        try
        {
            var shipment = await _shipmentService.AssignDriverAsync(id, request.DriverId);
            return Ok(shipment);
        }
        catch (Exception ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPut("{id}/reorder")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> ReorderShipment(int id, [FromBody] ReorderShipmentDto request)
    {
        var shipment = await _shipmentService.GetByIdAsync(id);
        if (shipment == null)
            return NotFound();
        
       
        return Ok(shipment);
    }

    private bool HasShipmentPermission()
    {
        if (User?.Identity?.IsAuthenticated != true)
            return false;

        var allowedRoles = new[] { "Admin", "Manager", "Supplier" };

        if (allowedRoles.Any(User.IsInRole))
            return true;

        return User.Claims.Any(c =>
            (c.Type == ClaimTypes.Role || c.Type == "role" || c.Type == "roles" || c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role")
            && allowedRoles.Any(role => string.Equals(c.Value, role, StringComparison.OrdinalIgnoreCase)));
    }
}