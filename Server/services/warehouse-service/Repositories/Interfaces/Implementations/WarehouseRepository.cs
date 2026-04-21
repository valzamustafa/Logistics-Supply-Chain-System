using Microsoft.EntityFrameworkCore;
using WarehouseService.Data;
using WarehouseService.Models;
using WarehouseService.Repositories.Interfaces;

namespace WarehouseService.Repositories.Implementations
{
    public class WarehouseRepository : IWarehouseRepository
    {
        private readonly WarehouseDbContext _context;

        public WarehouseRepository(WarehouseDbContext context)
        {
            _context = context;
        }

        
        public async Task<Warehouse?> GetWarehouseByIdAsync(int id)
        {
            return await _context.Warehouses
                .Include(w => w.Zones)
                .Include(w => w.Staff)
                .FirstOrDefaultAsync(w => w.Id == id);
        }

        public async Task<IEnumerable<Warehouse>> GetAllWarehousesAsync()
        {
            return await _context.Warehouses
                .Include(w => w.Zones)
                .Include(w => w.Staff)
                .ToListAsync();
        }

        public async Task<Warehouse> CreateWarehouseAsync(Warehouse warehouse)
        {
            _context.Warehouses.Add(warehouse);
            await _context.SaveChangesAsync();
            return warehouse;
        }

        public async Task<Warehouse> UpdateWarehouseAsync(Warehouse warehouse)
        {
            _context.Entry(warehouse).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return warehouse;
        }

        public async Task DeleteWarehouseAsync(int id)
        {
            var warehouse = await GetWarehouseByIdAsync(id);
            if (warehouse != null)
            {
                _context.Warehouses.Remove(warehouse);
                await _context.SaveChangesAsync();
            }
        }

public async Task<WarehouseStock?> GetStockByIdAsync(int id)
{
    return await _context.WarehouseStocks
        .Include(ws => ws.Warehouse)
        .FirstOrDefaultAsync(ws => ws.Id == id);
}

public async Task<WarehouseStock?> GetStockByWarehouseAndProductAsync(int warehouseId, int productId)
{
    return await _context.WarehouseStocks
        .Include(ws => ws.Warehouse)
        .FirstOrDefaultAsync(ws => ws.WarehouseId == warehouseId && ws.ProductId == productId);
}

public async Task<IEnumerable<WarehouseStock>> GetAllStockAsync()
{
    return await _context.WarehouseStocks
        .Include(ws => ws.Warehouse)
        .ToListAsync();
}

public async Task<IEnumerable<WarehouseStock>> GetStockByWarehouseAsync(int warehouseId)
{
    return await _context.WarehouseStocks
        .Include(ws => ws.Warehouse)
        .Where(ws => ws.WarehouseId == warehouseId)
        .ToListAsync();
}

public async Task<IEnumerable<WarehouseStock>> GetStockByProductAsync(int productId)
{
    return await _context.WarehouseStocks
        .Include(ws => ws.Warehouse)
        .Where(ws => ws.ProductId == productId)
        .ToListAsync();
}

public async Task<WarehouseStock> CreateStockAsync(WarehouseStock stock)
{
    _context.WarehouseStocks.Add(stock);
    await _context.SaveChangesAsync();
    return stock;
}

public async Task<WarehouseStock> UpdateStockAsync(WarehouseStock stock)
{
    _context.Entry(stock).State = EntityState.Modified;
    await _context.SaveChangesAsync();
    return stock;
}

public async Task DeleteStockAsync(int id)
{
    var stock = await GetStockByIdAsync(id);
    if (stock != null)
    {
        _context.WarehouseStocks.Remove(stock);
        await _context.SaveChangesAsync();
    }
}

public async Task<IEnumerable<StockMovement>> GetStockMovementsAsync(int warehouseStockId, int? limit = null)
{
    var query = _context.StockMovements
        .Where(sm => sm.WarehouseStockId == warehouseStockId)
        .OrderByDescending(sm => sm.CreatedAt);
    
    if (limit.HasValue)
        query = (IOrderedQueryable<StockMovement>)query.Take(limit.Value);
    
    return await query.ToListAsync();
}

public async Task<StockMovement> CreateStockMovementAsync(StockMovement movement)
{
    _context.StockMovements.Add(movement);
    await _context.SaveChangesAsync();
    return movement;
}

public async Task<IEnumerable<WarehouseStock>> GetLowStockItemsAsync(int? warehouseId = null)
{
    var query = _context.WarehouseStocks
        .Include(ws => ws.Warehouse)
        .Where(ws => ws.Quantity <= ws.MinimumStockLevel);
    
    if (warehouseId.HasValue)
        query = query.Where(ws => ws.WarehouseId == warehouseId.Value);
    
    return await query.ToListAsync();
}

       
        public async Task<WarehouseZone?> GetZoneByIdAsync(int id)
        {
            return await _context.WarehouseZones.FindAsync(id);
        }

        public async Task<IEnumerable<WarehouseZone>> GetZonesByWarehouseAsync(int warehouseId)
        {
            return await _context.WarehouseZones
                .Where(z => z.WarehouseId == warehouseId)
                .ToListAsync();
        }

        public async Task<WarehouseZone> CreateZoneAsync(WarehouseZone zone)
        {
            _context.WarehouseZones.Add(zone);
            await _context.SaveChangesAsync();
            return zone;
        }

        public async Task<WarehouseZone> UpdateZoneAsync(WarehouseZone zone)
        {
            _context.Entry(zone).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return zone;
        }

        public async Task DeleteZoneAsync(int id)
        {
            var zone = await GetZoneByIdAsync(id);
            if (zone != null)
            {
                _context.WarehouseZones.Remove(zone);
                await _context.SaveChangesAsync();
            }
        }

      
        public async Task<WarehouseStaff?> GetStaffByIdAsync(int id)
        {
            return await _context.WarehouseStaff.FindAsync(id);
        }

        public async Task<IEnumerable<WarehouseStaff>> GetStaffByWarehouseAsync(int warehouseId)
        {
            return await _context.WarehouseStaff
                .Where(s => s.WarehouseId == warehouseId)
                .ToListAsync();
        }

        public async Task<WarehouseStaff> AssignStaffAsync(WarehouseStaff staff)
        {
            _context.WarehouseStaff.Add(staff);
            await _context.SaveChangesAsync();
            return staff;
        }

        public async Task<WarehouseStaff> UpdateStaffAsync(WarehouseStaff staff)
        {
            _context.Entry(staff).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return staff;
        }

        public async Task RemoveStaffAsync(int id)
        {
            var staff = await GetStaffByIdAsync(id);
            if (staff != null)
            {
                _context.WarehouseStaff.Remove(staff);
                await _context.SaveChangesAsync();
            }
        }
    }
}