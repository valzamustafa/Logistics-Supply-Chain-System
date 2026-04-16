using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using ShipmentService.DTOs;
using ShipmentService.Services.Interfaces;
using ShipmentService.Repositories.Interfaces;

namespace ShipmentService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ShipmentsController : ControllerBase
{
    private readonly IShipmentService _shipmentService;
    private readonly IDriverRepository _driverRepository;
    
    public ShipmentsController(IShipmentService shipmentService, IDriverRepository driverRepository)
    {
        _shipmentService = shipmentService;
        _driverRepository = driverRepository;
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
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Create([FromBody] CreateShipmentDto request)
    {
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
        var shipment = await _shipmentService.UpdateStatusAsync(id, request.Status);
        return Ok(shipment);
    }
    
    [HttpPut("{id}/assign-driver")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> AssignDriver(int id, [FromBody] AssignDriverDto request)
    {
        var shipment = await _shipmentService.GetByIdAsync(id);
        if (shipment == null)
            return NotFound();
            
        var driver = await _driverRepository.GetByIdAsync(request.DriverId);
        if (driver == null)
            return NotFound(new { message = "Driver not found" });
            
        shipment.DriverId = request.DriverId;
        shipment.UpdatedAt = DateTime.UtcNow;
        
        var updated = await _shipmentService.UpdateStatusAsync(id, shipment.Status);
        return Ok(updated);
    }
    
    [HttpPut("{id}/reorder")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> ReorderShipment(int id, [FromBody] ReorderShipmentDto request)
    {
        var shipment = await _shipmentService.GetByIdAsync(id);
        if (shipment == null)
            return NotFound();
            
        shipment.Priority = request.NewPriority;
        shipment.UpdatedAt = DateTime.UtcNow;
        
       
        var updated = await _shipmentService.UpdateStatusAsync(id, shipment.Status);
        return Ok(updated);
    }
}

public class AssignDriverDto
{
    public int DriverId { get; set; }
}
