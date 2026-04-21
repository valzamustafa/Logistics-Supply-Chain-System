using Microsoft.EntityFrameworkCore;
using ShipmentService.Data;
using ShipmentService.Models;
using ShipmentService.Repositories.Interfaces;

namespace ShipmentService.Repositories;

public class VehicleRepository : IVehicleRepository
{
    private readonly ShipmentDbContext _context;
    
    public VehicleRepository(ShipmentDbContext context)
    {
        _context = context;
    }
    
    public async Task<IEnumerable<Vehicle>> GetAllAsync()
    {
        return await _context.Vehicles.ToListAsync();
    }
    
    public async Task<Vehicle?> GetByIdAsync(int id)
    {
        return await _context.Vehicles.FindAsync(id);
    }
    
    public async Task<IEnumerable<Vehicle>> GetAvailableAsync()
    {
        return await _context.Vehicles.Where(v => v.IsAvailable).ToListAsync();
    }
    
    public async Task<Vehicle> CreateAsync(Vehicle vehicle)
    {
        _context.Vehicles.Add(vehicle);
        await _context.SaveChangesAsync();
        return vehicle;
    }
    
    public async Task<Vehicle> UpdateAsync(Vehicle vehicle)
    {
        vehicle.UpdatedAt = DateTime.UtcNow;
        _context.Vehicles.Update(vehicle);
        await _context.SaveChangesAsync();
        return vehicle;
    }
    
    public async Task DeleteAsync(int id)
    {
        var vehicle = await _context.Vehicles.FindAsync(id);
        if (vehicle != null)
        {
            _context.Vehicles.Remove(vehicle);
            await _context.SaveChangesAsync();
        }
    }
}