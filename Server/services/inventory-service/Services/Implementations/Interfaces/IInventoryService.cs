using InventoryService.DTOs;

namespace InventoryService.Services.Interfaces
{
    public interface IInventoryService
    {
        Task<InventoryDto?> GetInventoryAsync(int productId, int warehouseId);
        Task<IEnumerable<InventoryDto>> GetAllInventoryAsync();
        Task<IEnumerable<InventoryDto>> GetInventoryByWarehouseAsync(int warehouseId);
        Task<StockMovementDto> UpdateStockAsync(UpdateStockDto request);
        
     
        Task<IEnumerable<LowStockAlertDto>> GetLowStockAlertsAsync();
        
   
        Task<bool> CheckStockAvailabilityAsync(int productId, int warehouseId, int quantity);
        
      
        Task<bool> ReserveStockAsync(int productId, int warehouseId, int quantity, string referenceType, int referenceId);
        
        
        Task<bool> ReleaseStockAsync(int productId, int warehouseId, int quantity, string referenceType, int referenceId);
        
   
        Task<bool> DeductStockAsync(int productId, int warehouseId, int quantity, string referenceType, int referenceId, string? notes);
        

        Task<bool> RestoreStockAsync(int productId, int warehouseId, int quantity, string referenceType, int referenceId, string? notes);
    }
}