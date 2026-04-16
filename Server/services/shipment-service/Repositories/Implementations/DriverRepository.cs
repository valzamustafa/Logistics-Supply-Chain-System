using Microsoft.EntityFrameworkCore;
using ShipmentService.Data;
using ShipmentService.Models;
using ShipmentService.Repositories.Interfaces;

namespace ShipmentService.Repositories;

public class DriverRepository : IDriverRepository
{
    private readonly ShipmentDbContext _context;
    
    public DriverRepository(ShipmentDbContext context)
    {
        _context = context;
    }
    
    public async Task<IEnumerable<Driver>> GetAllAsync()
    {
        return await _context.Drivers
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();
    }
    
    public async Task<Driver?> GetByIdAsync(int id)
    {
        return await _context.Drivers
            .FirstOrDefaultAsync(d => d.Id == id);
    }
    
    public async Task<Driver?> GetByUserIdAsync(int userId)
    {
        return await _context.Drivers
            .FirstOrDefaultAsync(d => d.UserId == userId);
    }
    
    public async Task<IEnumerable<Driver>> GetAvailableAsync()
    {
        return await _context.Drivers
            .Where(d => d.IsAvailable)
            .ToListAsync();
    }
    
    public async Task<Driver> CreateAsync(Driver driver)
    {
        _context.Drivers.Add(driver);
        await _context.SaveChangesAsync();
        return driver;
    }
    
    public async Task<Driver> UpdateAsync(Driver driver)
    {
        driver.UpdatedAt = DateTime.UtcNow;
        _context.Drivers.Update(driver);
        await _context.SaveChangesAsync();
        return driver;
    }
    
    public async Task DeleteAsync(int id)
    {
        var driver = await _context.Drivers.FindAsync(id);
        if (driver != null)
        {
            _context.Drivers.Remove(driver);
            await _context.SaveChangesAsync();
        }
    }
}