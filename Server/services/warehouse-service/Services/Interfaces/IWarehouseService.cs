using WarehouseService.DTOs;

namespace WarehouseService.Services.Interfaces
{
    public interface IWarehouseService
    {
   
        Task<IEnumerable<WarehouseDto>> GetAllWarehousesAsync();
        Task<WarehouseDto?> GetWarehouseByIdAsync(int id);
        Task<WarehouseDto> CreateWarehouseAsync(CreateWarehouseDto dto);
        Task<WarehouseDto> UpdateWarehouseAsync(int id, UpdateWarehouseDto dto);
        Task<bool> DeleteWarehouseAsync(int id);
        
   
        Task<IEnumerable<WarehouseZoneDto>> GetZonesByWarehouseAsync(int warehouseId);
        Task<WarehouseZoneDto> CreateZoneAsync(CreateWarehouseZoneDto dto);
        Task<bool> DeleteZoneAsync(int id);
        
      
        Task<IEnumerable<WarehouseStaffDto>> GetStaffByWarehouseAsync(int warehouseId);
        Task<WarehouseStaffDto> AssignStaffAsync(int warehouseId, AssignStaffDto dto);
        Task<bool> RemoveStaffAsync(int id);

     
        Task<IEnumerable<WarehouseStockDto>> GetAllStockAsync();
        Task<WarehouseStockDto?> GetStockByIdAsync(int id);
        Task<IEnumerable<WarehouseStockDto>> GetStockByWarehouseAsync(int warehouseId);
        Task<IEnumerable<WarehouseStockDto>> GetStockByProductAsync(int productId);
        Task<WarehouseStockDto> AssignProductToWarehouseAsync(int warehouseId, AssignProductToWarehouseDto dto);
        Task<WarehouseStockDto> UpdateStockAsync(int warehouseId, int productId, UpdateStockDto dto);
        Task<bool> RemoveProductFromWarehouseAsync(int warehouseId, int productId);
        Task<WarehouseStockDto> TransferStockAsync(TransferStockDto dto);
        Task<IEnumerable<StockMovementDto>> GetStockMovementsAsync(int warehouseId, int productId, int? limit = null);
        Task<IEnumerable<LowStockAlertDto>> GetLowStockAlertsAsync(int? warehouseId = null);
        Task<bool> IsProductAvailableAsync(int warehouseId, int productId, int requestedQuantity);
    }
}

