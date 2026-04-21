using WarehouseService.Models;

namespace WarehouseService.Repositories.Interfaces
{
    public interface IWarehouseRepository
    {
     
        Task<Warehouse?> GetWarehouseByIdAsync(int id);
        Task<IEnumerable<Warehouse>> GetAllWarehousesAsync();
        Task<Warehouse> CreateWarehouseAsync(Warehouse warehouse);
        Task<Warehouse> UpdateWarehouseAsync(Warehouse warehouse);
        Task DeleteWarehouseAsync(int id);
        
     
        Task<WarehouseZone?> GetZoneByIdAsync(int id);
        Task<IEnumerable<WarehouseZone>> GetZonesByWarehouseAsync(int warehouseId);
        Task<WarehouseZone> CreateZoneAsync(WarehouseZone zone);
        Task<WarehouseZone> UpdateZoneAsync(WarehouseZone zone);
        Task DeleteZoneAsync(int id);
        
    
        Task<WarehouseStaff?> GetStaffByIdAsync(int id);
        Task<IEnumerable<WarehouseStaff>> GetStaffByWarehouseAsync(int warehouseId);
        Task<WarehouseStaff> AssignStaffAsync(WarehouseStaff staff);
        Task<WarehouseStaff> UpdateStaffAsync(WarehouseStaff staff);
        Task RemoveStaffAsync(int id);
       
        Task<WarehouseStock?> GetStockByIdAsync(int id);
        Task<WarehouseStock?> GetStockByWarehouseAndProductAsync(int warehouseId, int productId);
        Task<IEnumerable<WarehouseStock>> GetAllStockAsync();
        Task<IEnumerable<WarehouseStock>> GetStockByWarehouseAsync(int warehouseId);
        Task<IEnumerable<WarehouseStock>> GetStockByProductAsync(int productId);
        Task<WarehouseStock> CreateStockAsync(WarehouseStock stock);
        Task<WarehouseStock> UpdateStockAsync(WarehouseStock stock);
        Task DeleteStockAsync(int id);
        Task<IEnumerable<StockMovement>> GetStockMovementsAsync(int warehouseStockId, int? limit = null);
        Task<StockMovement> CreateStockMovementAsync(StockMovement movement);
        Task<IEnumerable<WarehouseStock>> GetLowStockItemsAsync(int? warehouseId = null);
    }
}