using Microsoft.EntityFrameworkCore;
using InventoryService.Data;
using InventoryService.Models;
using InventoryService.Repositories.Interfaces;

namespace InventoryService.Repositories.Implementations
{
    public class InventoryRepository : IInventoryRepository
    {
        private readonly InventoryDbContext _context;

        public InventoryRepository(InventoryDbContext context)
        {
            _context = context;
        }

        public async Task<Inventory?> GetByIdAsync(int id)
        {
            return await _context.Inventories.FindAsync(id);
        }

        public async Task<Inventory?> GetByProductAndWarehouseAsync(int productId, int warehouseId)
        {
            return await _context.Inventories
                .FirstOrDefaultAsync(i => i.ProductId == productId && i.WarehouseId == warehouseId);
        }

        public async Task<IEnumerable<Inventory>> GetAllAsync()
        {
            return await _context.Inventories.ToListAsync();
        }

        public async Task<StockMovement> UpdateStockAsync(StockMovement movement, int warehouseId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var inventory = await GetByProductAndWarehouseAsync(movement.ProductId, warehouseId);
                
                if (inventory == null)
                {
                    inventory = new Inventory
                    {
                        ProductId = movement.ProductId,
                        WarehouseId = warehouseId,
                        Quantity = 0,
                        ReservedQuantity = 0,
                        CreatedBy = movement.CreatedBy,
                        UpdatedBy = movement.UpdatedBy
                    };
                    _context.Inventories.Add(inventory);
                }

                if (movement.Type == "IN")
                    inventory.Quantity += movement.Quantity;
                else if (movement.Type == "OUT")
                    inventory.Quantity -= movement.Quantity;
                else if (movement.Type == "RESERVE")
                    inventory.ReservedQuantity += movement.Quantity;
                else if (movement.Type == "RELEASE")
                    inventory.ReservedQuantity -= movement.Quantity;

                inventory.UpdatedAt = DateTime.UtcNow;
                inventory.UpdatedBy = movement.UpdatedBy;

                _context.StockMovements.Add(movement);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return movement;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<Inventory> CreateAsync(Inventory inventory)
        {
            _context.Inventories.Add(inventory);
            await _context.SaveChangesAsync();
            return inventory;
        }

        public async Task<Inventory> UpdateAsync(Inventory inventory)
        {
            _context.Entry(inventory).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return inventory;
        }
    }
}
