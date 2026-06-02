using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using ShipmentService.DTOs;
using ShipmentService.Services.Interfaces;
using ShipmentService.Repositories.Interfaces;
using BuildingBlocks;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ShipmentService.Data;
using ShipmentService.Hubs;
using System.Dynamic;
using System.Reflection;

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
    private readonly INotificationClient _notificationClient;
    private readonly IHubContext<DashboardHub> _hubContext;
    private readonly ShipmentDbContext _context;
    
    public ShipmentsController(
        IShipmentService shipmentService, 
        IDriverRepository driverRepository,
        IHttpClientFactory httpClientFactory,
        ILogger<ShipmentsController> logger,
        IConfiguration configuration,
        INotificationClient notificationClient,
        IHubContext<DashboardHub> hubContext,
        ShipmentDbContext context)
    {
        _shipmentService = shipmentService;
        _driverRepository = driverRepository;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _configuration = configuration;
        _notificationClient = notificationClient;
        _hubContext = hubContext;
        _context = context;
    }

    private string GetCurrentUserName()
    {
        return User.FindFirst(ClaimTypes.Name)?.Value
            ?? User.FindFirst("name")?.Value
            ?? User.FindFirst("preferred_username")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? "Unknown user";
    }

    private object FlattenWithActor(object target, string actor)
    {
        IDictionary<string, object?> expando = new ExpandoObject();
        foreach (var prop in target.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            expando[prop.Name] = prop.GetValue(target);
        }
        expando["updatedBy"] = actor;
        return expando;
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
    
    [Authorize(Policy = "ShipmentCreator")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateShipmentDto request)
    {
        try
        {
            _logger.LogInformation("Create shipment request received: OrderId={OrderId}, Items={ItemCount}, DriverId={DriverId}", 
                request.OrderId, request.Items?.Count ?? 0, request.DriverId);

            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid model state: {Errors}", 
                    string.Join("; ", ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage))));
                return BadRequest(new { message = "Invalid request data", errors = ModelState });
            }

            if (!HasShipmentPermission())
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "You do not have permission to create shipments." });

            var shipment = await _shipmentService.CreateAsync(request);
            _logger.LogInformation("Shipment created successfully: Id={ShipmentId}, TrackingNumber={TrackingNumber}", 
                shipment.Id, shipment.TrackingNumber);
            var currentUser = GetCurrentUserName();
            await _hubContext.Clients.All.SendAsync("ReceiveNewShipment", FlattenWithActor(shipment, currentUser));
            return CreatedAtAction(nameof(GetById), new { id = shipment.Id }, shipment);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid operation while creating shipment: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception creating shipment: {Message}", ex.Message);
            return StatusCode(StatusCodes.Status500InternalServerError, 
                new { message = "Error creating shipment", error = ex.Message });
        }
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

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst("sub")?.Value;

        if (int.TryParse(userIdClaim, out var userId))
        {
            var driver = await _driverRepository.GetByUserIdAsync(userId);
            if (driver != null)
            {
                var vehicle = await _context.Vehicles
                    .Where(v => v.DriverId == driver.Id && v.IsAvailable)
                    .OrderByDescending(v => v.UpdatedAt ?? v.CreatedAt)
                    .FirstOrDefaultAsync();

                if (vehicle != null)
                {
                    shipment.DriverId ??= driver.Id;
                    shipment.VehicleId = vehicle.Id;
                    vehicle.IsAvailable = false;
                    vehicle.UpdatedAt = DateTime.UtcNow;
                    shipment.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }
            }
        }
        
        var currentUser = GetCurrentUserName();
        await _hubContext.Clients.All.SendAsync("ReceiveShipmentUpdate", FlattenWithActor(shipment, currentUser));
        return Ok(shipment);
    }
    
    [Authorize(Roles = "Driver")]
    [HttpPost("{id}/complete")]
    public async Task<IActionResult> CompleteDelivery(int id, [FromBody] CompleteDeliveryDto dto)
    {
        var shipment = await _shipmentService.CompleteDeliveryAsync(id, dto.Proof);
        if (shipment == null)
            return NotFound();
        
        var currentUser = GetCurrentUserName();
        await _hubContext.Clients.All.SendAsync("ReceiveShipmentUpdate", FlattenWithActor(shipment, currentUser));
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
            
            var purchaseOrderStatus = request.Status switch
            {
                "Pending" => "Pending",
                "In Transit" => "Shipped",
                "Delivered" => "Delivered",
                "Out for Delivery" => "Shipped",
                "Failed Delivery" => "Pending",
                _ => "Shipped"
            };

            
            await UpdateSupplierPurchaseOrderStatus(shipmentModel, request, purchaseOrderStatus);
            
           
            var statusMessage = request.Status switch
            {
                "Pending" => "waiting for processing",
                "In Transit" => "in transit with driver",
                "Delivered" => "successfully delivered",
                _ => $"status updated to {request.Status}"
            };

            try
            {
                await _notificationClient.SendNotificationToRoleAsync(
                    "Manager",
                    "ShipmentStatusUpdated",
                    "Shipment Status Updated",
                    $"Shipment #{shipmentModel.Id} for Order {shipmentModel.OrderId} is now {statusMessage}.",
                    $"/shipments/{shipmentModel.Id}"
                );
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send shipment status notification for shipment {ShipmentId}", shipmentModel.Id);
            }

            var currentUser = GetCurrentUserName();
            await _hubContext.Clients.All.SendAsync("ReceiveShipmentUpdate", FlattenWithActor(shipmentModel, currentUser));
            await _hubContext.Clients.All.SendAsync("ReceiveOrderUpdate", new {
                orderId = shipmentModel.OrderId,
                purchaseOrderId = shipmentModel.PurchaseOrderId,
                status = request.Status,
                purchaseOrderStatus = purchaseOrderStatus,
                shipmentId = shipmentModel.Id,
                actor = currentUser
            });

            return Ok(shipmentModel);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating shipment status for ID: {ShipmentId}", id);
            return StatusCode(500, new { message = "Error updating shipment status", error = ex.Message });
        }
    }

    private async Task UpdateSupplierPurchaseOrderStatus(ShipmentService.Models.Shipment shipment, UpdateShipmentStatusDto request, string purchaseOrderStatus)
    {
        try
        {
            var supplierApiUrl = _configuration["Services:SupplierService"] ?? "http://localhost:5000";
            
            var purchaseOrderId = shipment.PurchaseOrderId ?? shipment.OrderId;
            
            var updateData = new
            {
                status = purchaseOrderStatus,
                actualDeliveryDate = request.Status == "Delivered" ? DateTime.UtcNow : (DateTime?)null,
                notes = $"Shipment {shipment.TrackingNumber} status: {request.Status}. Location: {request.Location ?? "N/A"}. {request.Notes ?? ""}"
            };
            
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Internal-Request", "true");
            client.Timeout = TimeSpan.FromSeconds(10);
            
            var endpoint = $"{supplierApiUrl}/api/purchaseorders/{purchaseOrderId}/update-status";
            
            var content = new StringContent(
                JsonSerializer.Serialize(updateData),
                Encoding.UTF8,
                "application/json");
            
            var response = await client.PutAsync(endpoint, content);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Failed to update purchase order {PurchaseOrderId} for shipment {TrackingNumber}. Status: {StatusCode}, Error: {Error}", 
                    shipment.PurchaseOrderId, shipment.TrackingNumber, response.StatusCode, errorBody);
            }
            else
            {
                var responseBody = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("Successfully updated purchase order {PurchaseOrderId} to status {Status} from shipment {TrackingNumber}", 
                    shipment.PurchaseOrderId, purchaseOrderStatus, shipment.TrackingNumber);
            }
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP error when updating purchase order for shipment {TrackingNumber}", shipment.TrackingNumber);
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

    [Authorize(Roles = "Driver,Supplier,Admin,Manager,Warehouse,WarehouseStaff,User")]
    [HttpGet("{id}/tracking/live")]
    public async Task<IActionResult> GetLiveTracking(int id)
    {
        var shipment = await _shipmentService.GetByIdAsync(id);
        if (shipment == null)
            return NotFound();

        var driverName = shipment.DriverId.HasValue ? $"Driver #{shipment.DriverId}" : "Not assigned";
        var driverPhone = "N/A";

        if (shipment.DriverId.HasValue)
        {
            var driver = await _driverRepository.GetByIdAsync(shipment.DriverId.Value);
            if (driver != null)
            {
                driverName = $"Driver #{driver.Id}";
                driverPhone = driver.PhoneNumber ?? "N/A";
            }
        }

        return Ok(new
        {
            shipment.TrackingNumber,
            shipment.CurrentLocation,
            shipment.LastLocationUpdate,
            shipment.Status,
            shipment.EstimatedDeliveryDate,
            DriverName = driverName,
            DriverPhone = driverPhone
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
        
        // Call supplier API to update order status
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
    [Authorize(Policy = "ShipmentCreator")]
    [HttpPut("{id}/assign-driver")]
    public async Task<IActionResult> AssignDriver(int id, [FromBody] AssignDriverDto request)
    {
        if (!HasShipmentPermission())
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "You do not have permission to assign drivers to shipments." });

        try
        {
            var shipment = await _shipmentService.AssignDriverAsync(id, request.DriverId);
            await _hubContext.Clients.All.SendAsync("ReceiveShipmentUpdate", shipment);
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

    [HttpPost("broadcast-order-update")]
    [AllowAnonymous]
    public async Task<IActionResult> BroadcastOrderUpdate([FromBody] BroadcastOrderUpdateDto request)
    {
       
        var isInternal = HttpContext.Request.Headers.TryGetValue("X-Internal-Request", out var internalHeader) 
            && internalHeader == "true";
        
        if (!isInternal)
            return Unauthorized(new { message = "This endpoint is for internal service communication only" });

        try
        {
           
            await _hubContext.Clients.All.SendAsync("ReceiveOrderUpdate", new
            {
                orderId = request.OrderId,
                purchaseOrderId = request.PurchaseOrderId,
                status = request.Status,
                purchaseOrderStatus = request.Status,
                actor = request.Actor ?? "System"
            });

            return Ok(new { success = true, message = "Order update broadcasted" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error broadcasting order update for order {OrderId}", request.OrderId);
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    private bool HasShipmentPermission()
    {
        if (User?.Identity?.IsAuthenticated != true)
            return false;

        var allowedRoles = new[] { "Admin", "Manager", "Supplier", "Warehouse", "WarehouseStaff" };

        if (allowedRoles.Any(User.IsInRole))
            return true;

        var roleClaims = User.Claims.Where(c =>
            c.Type == ClaimTypes.Role ||
            c.Type == "role" ||
            c.Type == "roles" ||
            c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role");

        return roleClaims.Any(c => allowedRoles.Any(role => string.Equals(c.Value, role, StringComparison.OrdinalIgnoreCase)));
    }
}

public class BroadcastOrderUpdateDto
{
    public int OrderId { get; set; }
    public int PurchaseOrderId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Actor { get; set; }
}