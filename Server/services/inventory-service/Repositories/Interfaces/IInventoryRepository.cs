using InventoryService.Models;

namespace InventoryService.Repositories.Interfaces
{
    public interface IInventoryRepository
    {
        Task<Inventory?> GetByIdAsync(int id);
        Task<Inventory?> GetByProductAndWarehouseAsync(int productId, int warehouseId);
        Task<IEnumerable<Inventory>> GetAllAsync();
        Task<IEnumerable<Inventory>> GetByWarehouseAsync(int warehouseId);
        Task<StockMovement> UpdateStockAsync(StockMovement movement, int warehouseId);
        Task<Inventory> CreateAsync(Inventory inventory);
        Task<Inventory> UpdateAsync(Inventory inventory);
    }
}

