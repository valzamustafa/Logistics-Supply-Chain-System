namespace WarehouseService.Services.Interfaces
{
    public interface IWarehouseNotificationService
    {
        Task NotifyWarehouseCreatedAsync(int warehouseId, string warehouseName, string location);
        Task NotifyWarehouseUpdatedAsync(int warehouseId, string warehouseName, string location);
        Task NotifyWarehouseDeletedAsync(string warehouseName, string location);
        Task NotifyWarehouseStatusChangedAsync(int warehouseId, string warehouseName, bool isActive);
        
        Task NotifyZoneCreatedAsync(string zoneName, string warehouseName, int capacity);
        Task NotifyZoneDeletedAsync(string zoneName, string warehouseName);
        
        Task NotifyStaffAssignedAsync(int userId, string warehouseName, string position);
        Task NotifyStaffRemovedAsync(int userId, string warehouseName);
        
        Task NotifyProductAssignedAsync(int warehouseId, string warehouseName, string productName, int quantity);
        Task NotifyProductRemovedAsync(int warehouseId, string warehouseName, string productName);
        
        Task NotifyStockUpdatedAsync(int warehouseId, string warehouseName, string productName, int oldQuantity, int newQuantity, string movementType);
        Task NotifyStockTransferredAsync(string sourceWarehouse, string destWarehouse, string productName, int quantity);
        
        Task NotifyLowStockAlertAsync(int warehouseId, string warehouseName, string productName, int currentQuantity, int minimumLevel, int deficit);
        Task NotifyOutOfStockAlertAsync(int warehouseId, string warehouseName, string productName);
        Task NotifyOverstockAlertAsync(int warehouseId, string warehouseName, string productName, int currentQuantity, int maximumLevel);
    }
}