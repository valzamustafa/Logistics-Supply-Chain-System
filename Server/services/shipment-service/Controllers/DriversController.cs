using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShipmentService.Models;
using ShipmentService.Repositories.Interfaces;

namespace ShipmentService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DriversController : ControllerBase
{
    private readonly IDriverRepository _driverRepository;
    
    public DriversController(IDriverRepository driverRepository)
    {
        _driverRepository = driverRepository;
    }
    
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var drivers = await _driverRepository.GetAllAsync();
        return Ok(drivers);
    }
    
    [HttpGet("available")]
    public async Task<IActionResult> GetAvailable()
    {
        var drivers = await _driverRepository.GetAvailableAsync();
        return Ok(drivers);
    }
    
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var driver = await _driverRepository.GetByIdAsync(id);
        if (driver == null)
            return NotFound();
        return Ok(driver);
    }
    
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] Driver driver)
    {
        var created = await _driverRepository.CreateAsync(driver);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }
    
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] Driver driver)
    {
        var existing = await _driverRepository.GetByIdAsync(id);
        if (existing == null)
            return NotFound();
            
        existing.LicenseNumber = driver.LicenseNumber;
        existing.PhoneNumber = driver.PhoneNumber;
        existing.IsAvailable = driver.IsAvailable;
        existing.UpdatedAt = DateTime.UtcNow;
        
        var updated = await _driverRepository.UpdateAsync(existing);
        return Ok(updated);
    }
    
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        await _driverRepository.DeleteAsync(id);
        return NoContent();
    }
}
