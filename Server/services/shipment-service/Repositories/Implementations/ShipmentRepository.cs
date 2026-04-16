using Microsoft.EntityFrameworkCore;
using ShipmentService.Data;
using ShipmentService.Models;
using ShipmentService.Repositories.Interfaces;

namespace ShipmentService.Repositories;

public class ShipmentRepository : IShipmentRepository
{
    private readonly ShipmentDbContext _context;
    
    public ShipmentRepository(ShipmentDbContext context)
    {
        _context = context;
    }
    
    public async Task<IEnumerable<Shipment>> GetAllAsync()
    {
        return await _context.Shipments
            .Include(s => s.Driver)
            .Include(s => s.Vehicle)
            .Include(s => s.Items)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();
    }
    
    public async Task<Shipment?> GetByIdAsync(int id)
    {
        return await _context.Shipments
            .Include(s => s.Driver)
            .Include(s => s.Vehicle)
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == id);
    }
    
    public async Task<IEnumerable<Shipment>> GetByOrderIdAsync(int orderId)
    {
        return await _context.Shipments
            .Include(s => s.Driver)
            .Include(s => s.Vehicle)
            .Include(s => s.Items)
            .Where(s => s.OrderId == orderId)
            .ToListAsync();
    }
    
    public async Task<IEnumerable<Shipment>> GetByDriverIdAsync(int driverId)
    {
        return await _context.Shipments
            .Include(s => s.Driver)
            .Include(s => s.Vehicle)
            .Include(s => s.Items)
            .Where(s => s.DriverId == driverId)
            .OrderBy(s => s.EstimatedDeliveryDate)
            .ToListAsync();
    }
    
    public async Task<Shipment> CreateAsync(Shipment shipment)
    {
        _context.Shipments.Add(shipment);
        await _context.SaveChangesAsync();
        return shipment;
    }
    
    public async Task<Shipment> UpdateAsync(Shipment shipment)
    {
        shipment.UpdatedAt = DateTime.UtcNow;
        _context.Shipments.Update(shipment);
        await _context.SaveChangesAsync();
        return shipment;
    }
    
    public async Task DeleteAsync(int id)
    {
        var shipment = await _context.Shipments.FindAsync(id);
        if (shipment != null)
        {
            _context.Shipments.Remove(shipment);
            await _context.SaveChangesAsync();
        }
    }
}