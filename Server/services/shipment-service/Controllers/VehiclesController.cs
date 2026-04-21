using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShipmentService.Data;
using ShipmentService.Models;
using Microsoft.EntityFrameworkCore;

namespace ShipmentService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VehiclesController : ControllerBase
{
    private readonly ShipmentDbContext _context;
    
    public VehiclesController(ShipmentDbContext context)
    {
        _context = context;
    }
    
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var vehicles = await _context.Vehicles.ToListAsync();
        return Ok(vehicles);
    }
    
    [HttpGet("available")]
    public async Task<IActionResult> GetAvailable()
    {
        var vehicles = await _context.Vehicles.Where(v => v.IsAvailable).ToListAsync();
        return Ok(vehicles);
    }
    
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var vehicle = await _context.Vehicles.FindAsync(id);
        if (vehicle == null)
            return NotFound();
        return Ok(vehicle);
    }
    
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] Vehicle vehicle)
    {
        _context.Vehicles.Add(vehicle);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = vehicle.Id }, vehicle);
    }
    
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] Vehicle vehicle)
    {
        var existing = await _context.Vehicles.FindAsync(id);
        if (existing == null)
            return NotFound();
            
        existing.PlateNumber = vehicle.PlateNumber;
        existing.Model = vehicle.Model;
        existing.Capacity = vehicle.Capacity;
        existing.IsAvailable = vehicle.IsAvailable;
        existing.UpdatedAt = DateTime.UtcNow;
        
        _context.Vehicles.Update(existing);
        await _context.SaveChangesAsync();
        return Ok(existing);
    }
    
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var vehicle = await _context.Vehicles.FindAsync(id);
        if (vehicle == null)
            return NotFound();
            
        _context.Vehicles.Remove(vehicle);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}