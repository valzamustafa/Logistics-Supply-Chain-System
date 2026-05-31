
using BuildingBlocks;
using Microsoft.Extensions.Logging;
using WarehouseService.Services.Interfaces;

namespace WarehouseService.Services
{
    public class WarehouseNotificationService : IWarehouseNotificationService
    {
        private readonly INotificationClient _notificationClient;
        private readonly ILogger<WarehouseNotificationService> _logger;

        public WarehouseNotificationService(
            INotificationClient notificationClient,
            ILogger<WarehouseNotificationService> logger)
        {
            _notificationClient = notificationClient;
            _logger = logger;
        }

        public async Task NotifyWarehouseCreatedAsync(int warehouseId, string warehouseName, string location)
        {
            try
            {
                await _notificationClient.SendNotificationToRoleAsync(
                    "Admin",
                    "WarehouseCreated",
                    "New Warehouse Created",
                    $"Warehouse '{warehouseName}' at {location} has been successfully created. ID: #{warehouseId}",
                    $"/warehouses/{warehouseId}"
                );
                _logger.LogInformation($"Notification sent: Warehouse {warehouseName} created");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send warehouse created notification");
            }
        }

        public async Task NotifyWarehouseUpdatedAsync(int warehouseId, string warehouseName, string location)
        {
            try
            {
                await _notificationClient.SendNotificationToRoleAsync(
                    "Admin",
                    "WarehouseUpdated",
                    "Warehouse Updated",
                    $"Warehouse '{warehouseName}' at {location} has been updated successfully.",
                    $"/warehouses/{warehouseId}"
                );
                _logger.LogInformation($"Notification sent: Warehouse {warehouseName} updated");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send warehouse updated notification");
            }
        }

        public async Task NotifyWarehouseDeletedAsync(string warehouseName, string location)
        {
            try
            {
                await _notificationClient.SendNotificationToRoleAsync(
                    "Admin",
                    "WarehouseDeleted",
                    "Warehouse Removed",
                    $"Warehouse '{warehouseName}' at {location} has been deleted from the system.",
                    "/warehouses"
                );
                _logger.LogInformation($"Notification sent: Warehouse {warehouseName} deleted");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send warehouse deleted notification");
            }
        }

        public async Task NotifyWarehouseStatusChangedAsync(int warehouseId, string warehouseName, bool isActive)
        {
            try
            {
                var status = isActive ? "ACTIVE" : "INACTIVE";
                await _notificationClient.SendNotificationToRoleAsync(
                    "Admin",
                    "WarehouseStatusChanged",
                    $"Warehouse {status}",
                    $"Warehouse '{warehouseName}' is now {status}. All operations have been {(isActive ? "enabled" : "disabled")}.",
                    $"/warehouses/{warehouseId}"
                );
                _logger.LogInformation($"Notification sent: Warehouse {warehouseName} status changed to {status}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send warehouse status change notification");
            }
        }

        public async Task NotifyZoneCreatedAsync(string zoneName, string warehouseName, int capacity)
        {
            try
            {
                await _notificationClient.SendNotificationToRoleAsync(
                    "WarehouseStaff",
                    "ZoneCreated",
                    "New Warehouse Zone Added",
                    $"Zone '{zoneName}' has been created in warehouse '{warehouseName}' with capacity of {capacity} units.",
                    null
                );
                _logger.LogInformation($"Notification sent: Zone {zoneName} created");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send zone created notification");
            }
        }

        public async Task NotifyZoneDeletedAsync(string zoneName, string warehouseName)
        {
            try
            {
                await _notificationClient.SendNotificationToRoleAsync(
                    "WarehouseStaff",
                    "ZoneDeleted",
                    "Warehouse Zone Removed",
                    $"Zone '{zoneName}' has been removed from warehouse '{warehouseName}'.",
                    null
                );
                _logger.LogInformation($"Notification sent: Zone {zoneName} deleted");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send zone deleted notification");
            }
        }

        public async Task NotifyStaffAssignedAsync(int userId, string warehouseName, string position)
        {
            try
            {
                await _notificationClient.SendNotificationAsync(
                    userId,
                    "StaffAssigned",
                    "Assigned to Warehouse",
                    $"You have been assigned as {position} at warehouse '{warehouseName}'. Welcome to the team!",
                    "/warehouse/dashboard"
                );
                _logger.LogInformation($"Notification sent: User {userId} assigned to {warehouseName}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send staff assigned notification");
            }
        }

        public async Task NotifyStaffRemovedAsync(int userId, string warehouseName)
        {
            try
            {
                await _notificationClient.SendNotificationAsync(
                    userId,
                    "StaffRemoved",
                    "Warehouse Assignment Removed",
                    $"Your assignment to warehouse '{warehouseName}' has been removed. Contact your administrator for more information.",
                    null
                );
                _logger.LogInformation($"Notification sent: User {userId} removed from {warehouseName}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send staff removed notification");
            }
        }

        public async Task NotifyProductAssignedAsync(int warehouseId, string warehouseName, string productName, int quantity)
        {
            try
            {
                await _notificationClient.SendNotificationToRoleAsync(
                    "WarehouseStaff",
                    "ProductAssigned",
                    "New Product Added to Warehouse",
                    $"Product '{productName}' has been assigned to warehouse '{warehouseName}' with initial quantity of {quantity} units.",
                    $"/warehouses/{warehouseId}/inventory"
                );
                _logger.LogInformation($"Notification sent: Product {productName} assigned to {warehouseName}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send product assigned notification");
            }
        }

        public async Task NotifyProductRemovedAsync(int warehouseId, string warehouseName, string productName)
        {
            try
            {
                await _notificationClient.SendNotificationToRoleAsync(
                    "WarehouseStaff",
                    "ProductRemoved",
                    "Product Removed from Warehouse",
                    $"Product '{productName}' has been removed from warehouse '{warehouseName}'.",
                    $"/warehouses/{warehouseId}"
                );
                _logger.LogInformation($"Notification sent: Product {productName} removed from {warehouseName}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send product removed notification");
            }
        }

        public async Task NotifyStockUpdatedAsync(int warehouseId, string warehouseName, string productName, int oldQuantity, int newQuantity, string movementType)
        {
            try
            {
                var change = newQuantity - oldQuantity;
                var changeDirection = change > 0 ? "increased" : "decreased";
                var absoluteChange = Math.Abs(change);
                
                await _notificationClient.SendNotificationToRoleAsync(
                    "WarehouseStaff",
                    "StockUpdated",
                    $"Stock {movementType} - {productName}",
                    $"Stock for '{productName}' has {changeDirection} by {absoluteChange} units. Current stock: {newQuantity} units (was: {oldQuantity}) at warehouse '{warehouseName}'.",
                    $"/warehouses/{warehouseId}/inventory"
                );
                _logger.LogInformation($"Notification sent: Stock updated for {productName} at {warehouseName}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send stock updated notification");
            }
        }

        public async Task NotifyStockTransferredAsync(string sourceWarehouse, string destWarehouse, string productName, int quantity)
        {
            try
            {
                await _notificationClient.SendNotificationToRoleAsync(
                    "WarehouseStaff",
                    "StockTransfer",
                    "Stock Transfer Initiated",
                    $"Stock transfer initiated: {quantity} units of '{productName}' from '{sourceWarehouse}' to '{destWarehouse}'.",
                    null
                );
                _logger.LogInformation($"Notification sent: Stock transfer for {productName}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send stock transfer notification");
            }
        }

        public async Task NotifyLowStockAlertAsync(int warehouseId, string warehouseName, string productName, int currentQuantity, int minimumLevel, int deficit)
        {
            try
            {
                await _notificationClient.SendNotificationToRoleAsync(
                    "Manager",
                    "LowStockAlert",
                    $"LOW STOCK ALERT: {productName}",
                    $"Product '{productName}' at warehouse '{warehouseName}' is below minimum stock level. Current: {currentQuantity} units, Minimum: {minimumLevel} units, Deficit: {deficit} units. Immediate reorder required!",
                    $"/warehouses/{warehouseId}/inventory"
                );
                
                await _notificationClient.SendNotificationToRoleAsync(
                    "WarehouseStaff",
                    "LowStockAlert",
                    $"Low Stock Alert - {productName}",
                    $"Product '{productName}' at warehouse '{warehouseName}' is running low. Current stock: {currentQuantity} units. Please reorder {deficit} units to reach minimum level.",
                    $"/warehouses/{warehouseId}/inventory"
                );
                _logger.LogInformation($"Notification sent: Low stock alert for {productName}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send low stock alert notification");
            }
        }

        public async Task NotifyOutOfStockAlertAsync(int warehouseId, string warehouseName, string productName)
        {
            try
            {
                await _notificationClient.SendNotificationToRoleAsync(
                    "Manager",
                    "OutOfStockAlert",
                    $"OUT OF STOCK: {productName}",
                    $"URGENT: Product '{productName}' is now OUT OF STOCK at warehouse '{warehouseName}'. Customer orders may be affected. Immediate action required!",
                    $"/warehouses/{warehouseId}/inventory"
                );
                _logger.LogInformation($"Notification sent: Out of stock alert for {productName}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send out of stock alert notification");
            }
        }

        public async Task NotifyOverstockAlertAsync(int warehouseId, string warehouseName, string productName, int currentQuantity, int maximumLevel)
        {
            try
            {
                await _notificationClient.SendNotificationToRoleAsync(
                    "Manager",
                    "OverstockAlert",
                    $"Overstock Alert - {productName}",
                    $"Product '{productName}' has exceeded maximum stock level at warehouse '{warehouseName}'. Current: {currentQuantity} units, Maximum: {maximumLevel} units. Consider transferring excess stock.",
                    $"/warehouses/{warehouseId}/inventory"
                );
                _logger.LogInformation($"Notification sent: Overstock alert for {productName}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send overstock alert notification");
            }
        }
    }
}