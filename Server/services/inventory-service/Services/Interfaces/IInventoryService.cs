using InventoryService.DTOs;

namespace InventoryService.Services.Interfaces
{
    public interface IInventoryService
    {
        Task<InventoryDto?> GetInventoryAsync(int productId, int warehouseId);
        Task<IEnumerable<InventoryDto>> GetAllInventoryAsync();
        Task<IEnumerable<InventoryDto>> GetInventoryByWarehouseAsync(int warehouseId);
        Task<StockMovementDto> UpdateStockAsync(UpdateStockDto request);
    }
}

