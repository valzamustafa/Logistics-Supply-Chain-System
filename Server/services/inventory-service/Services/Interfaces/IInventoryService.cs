using InventoryService.DTOs;

namespace InventoryService.Services.Interfaces
{
    public interface IInventoryService
    {
        Task<InventoryDto?> GetInventoryAsync(int productId, int warehouseId);
        Task<IEnumerable<InventoryDto>> GetAllInventoryAsync();
        Task<StockMovementDto> UpdateStockAsync(UpdateStockDto request);
    }
}

