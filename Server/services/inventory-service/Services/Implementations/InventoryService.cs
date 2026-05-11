using InventoryService.DTOs;
using InventoryService.Models;
using InventoryService.Repositories.Interfaces;
using InventoryService.Services.Interfaces;
using System.Net.Http.Json;

namespace InventoryService.Business
{
    public class InventoryService : IInventoryService
    {
        private readonly IInventoryRepository _inventoryRepository;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;

        public InventoryService(
            IInventoryRepository inventoryRepository,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration)
        {
            _inventoryRepository = inventoryRepository;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        public async Task<InventoryDto?> GetInventoryAsync(int productId, int warehouseId)
        {
            var inventory = await _inventoryRepository.GetByProductAndWarehouseAsync(productId, warehouseId);
            return inventory == null ? null : await MapToDto(inventory);
        }

        public async Task<IEnumerable<InventoryDto>> GetAllInventoryAsync()
        {
            var inventory = await _inventoryRepository.GetAllAsync();
            var dtos = new List<InventoryDto>();
            foreach (var item in inventory)
            {
                dtos.Add(await MapToDto(item));
            }
            return dtos;
        }

        public async Task<IEnumerable<InventoryDto>> GetInventoryByWarehouseAsync(int warehouseId)
        {
            var inventory = await _inventoryRepository.GetByWarehouseAsync(warehouseId);
            var dtos = new List<InventoryDto>();
            foreach (var item in inventory)
            {
                dtos.Add(await MapToDto(item));
            }
            return dtos;
        }

        public async Task<StockMovementDto> UpdateStockAsync(UpdateStockDto request)
        {
          
            if (request.Type == "OUT")
            {
                var currentInventory = await _inventoryRepository.GetByProductAndWarehouseAsync(
                    request.ProductId, request.WarehouseId);
                
                if (currentInventory == null)
                {
                    throw new InvalidOperationException($"No inventory found for product {request.ProductId} in warehouse {request.WarehouseId}");
                }

                int availableQuantity = currentInventory.Quantity - currentInventory.ReservedQuantity;
                if (availableQuantity < request.Quantity)
                {
                    throw new InvalidOperationException(
                        $"Insufficient stock. Available: {availableQuantity}, Requested: {request.Quantity}");
                }
            }

          
            if (request.Type == "RELEASE")
            {
                var currentInventory = await _inventoryRepository.GetByProductAndWarehouseAsync(
                    request.ProductId, request.WarehouseId);
                
                if (currentInventory == null || currentInventory.ReservedQuantity < request.Quantity)
                {
                    throw new InvalidOperationException("Cannot release more than reserved quantity");
                }
            }

            var movement = new StockMovement
            {
                ProductId = request.ProductId,
                Quantity = request.Quantity,
                Type = request.Type,
                ReferenceType = request.ReferenceType,
                ReferenceId = request.ReferenceId,
                Notes = request.Notes,
                MovementDate = DateTime.UtcNow,
                CreatedBy = 1,
                UpdatedBy = 1
            };

            var result = await _inventoryRepository.UpdateStockAsync(movement, request.WarehouseId);
            
            return new StockMovementDto
            {
                Id = result.Id,
                ProductId = result.ProductId,
                Quantity = result.Quantity,
                Type = result.Type,
                ReferenceType = result.ReferenceType,
                ReferenceId = result.ReferenceId,
                Notes = result.Notes,
                MovementDate = result.MovementDate
            };
        }

       
        public async Task<IEnumerable<LowStockAlertDto>> GetLowStockAlertsAsync()
        {
            var allInventory = await _inventoryRepository.GetAllAsync();
            var alerts = new List<LowStockAlertDto>();

            foreach (var inventory in allInventory)
            {
                if (inventory.ReorderLevel.HasValue && inventory.Quantity <= inventory.ReorderLevel.Value)
                {
                    alerts.Add(new LowStockAlertDto
                    {
                        Id = inventory.Id,
                        InventoryId = inventory.Id,
                        ProductId = inventory.ProductId,
                        CurrentQuantity = inventory.Quantity,
                        ThresholdLevel = inventory.ReorderLevel.Value,
                        IsResolved = false,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            return alerts;
        }

       
        public async Task<bool> CheckStockAvailabilityAsync(int productId, int warehouseId, int quantity)
        {
            var inventory = await _inventoryRepository.GetByProductAndWarehouseAsync(productId, warehouseId);
            
            if (inventory == null)
                return false;

            int availableQuantity = inventory.Quantity - inventory.ReservedQuantity;
            return availableQuantity >= quantity;
        }

        
        public async Task<bool> ReserveStockAsync(int productId, int warehouseId, int quantity, string referenceType, int referenceId)
        {
            var inventory = await _inventoryRepository.GetByProductAndWarehouseAsync(productId, warehouseId);
            
            if (inventory == null)
                return false;

            int availableQuantity = inventory.Quantity - inventory.ReservedQuantity;
            if (availableQuantity < quantity)
                return false;

            var movement = new StockMovement
            {
                ProductId = productId,
                Quantity = quantity,
                Type = "RESERVE",
                ReferenceType = referenceType,
                ReferenceId = referenceId,
                Notes = $"Reserved for {referenceType} {referenceId}",
                MovementDate = DateTime.UtcNow,
                CreatedBy = 1,
                UpdatedBy = 1
            };

            await _inventoryRepository.UpdateStockAsync(movement, warehouseId);
            return true;
        }

        
        public async Task<bool> ReleaseStockAsync(int productId, int warehouseId, int quantity, string referenceType, int referenceId)
        {
            var inventory = await _inventoryRepository.GetByProductAndWarehouseAsync(productId, warehouseId);
            
            if (inventory == null || inventory.ReservedQuantity < quantity)
                return false;

            var movement = new StockMovement
            {
                ProductId = productId,
                Quantity = quantity,
                Type = "RELEASE",
                ReferenceType = referenceType,
                ReferenceId = referenceId,
                Notes = $"Released from {referenceType} {referenceId}",
                MovementDate = DateTime.UtcNow,
                CreatedBy = 1,
                UpdatedBy = 1
            };

            await _inventoryRepository.UpdateStockAsync(movement, warehouseId);
            return true;
        }

       
        public async Task<bool> DeductStockAsync(int productId, int warehouseId, int quantity, string referenceType, int referenceId, string? notes)
        {
            var inventory = await _inventoryRepository.GetByProductAndWarehouseAsync(productId, warehouseId);
            
            if (inventory == null)
                return false;

            int availableQuantity = inventory.Quantity - inventory.ReservedQuantity;
            if (availableQuantity < quantity)
                return false;

            var movement = new StockMovement
            {
                ProductId = productId,
                Quantity = quantity,
                Type = "OUT",
                ReferenceType = referenceType,
                ReferenceId = referenceId,
                Notes = notes ?? $"Deducted for {referenceType} {referenceId}",
                MovementDate = DateTime.UtcNow,
                CreatedBy = 1,
                UpdatedBy = 1
            };

            await _inventoryRepository.UpdateStockAsync(movement, warehouseId);
            return true;
        }

      
        public async Task<bool> RestoreStockAsync(int productId, int warehouseId, int quantity, string referenceType, int referenceId, string? notes)
        {
            var movement = new StockMovement
            {
                ProductId = productId,
                Quantity = quantity,
                Type = "IN",
                ReferenceType = referenceType,
                ReferenceId = referenceId,
                Notes = notes ?? $"Restored from return {referenceId}",
                MovementDate = DateTime.UtcNow,
                CreatedBy = 1,
                UpdatedBy = 1
            };

            await _inventoryRepository.UpdateStockAsync(movement, warehouseId);
            return true;
        }

        private async Task<InventoryDto> MapToDto(Inventory inventory)
        {
            var dto = new InventoryDto
            {
                Id = inventory.Id,
                ProductId = inventory.ProductId,
                WarehouseId = inventory.WarehouseId,
                Quantity = inventory.Quantity,
                ReservedQuantity = inventory.ReservedQuantity,
                AvailableQuantity = inventory.Quantity - inventory.ReservedQuantity,
                ReorderLevel = inventory.ReorderLevel
            };

           
            try
            {
                var productClient = _httpClientFactory.CreateClient();
                var productResponse = await productClient.GetAsync($"http://product-service:80/api/products/{inventory.ProductId}");
                if (productResponse.IsSuccessStatusCode)
                {
                    var product = await productResponse.Content.ReadFromJsonAsync<dynamic>();
                    dto.ProductName = product?.name?.ToString() ?? $"Product {inventory.ProductId}";
                }
                else
                {
                    dto.ProductName = $"Product {inventory.ProductId}";
                }
            }
            catch
            {
                dto.ProductName = $"Product {inventory.ProductId}";
            }

           
            try
            {
                var warehouseClient = _httpClientFactory.CreateClient();
                var warehouseResponse = await warehouseClient.GetAsync($"http://warehouse-service:80/api/warehouses/{inventory.WarehouseId}");
                if (warehouseResponse.IsSuccessStatusCode)
                {
                    var warehouse = await warehouseResponse.Content.ReadFromJsonAsync<dynamic>();
                    dto.WarehouseName = warehouse?.name?.ToString() ?? $"Warehouse {inventory.WarehouseId}";
                }
                else
                {
                    dto.WarehouseName = $"Warehouse {inventory.WarehouseId}";
                }
            }
            catch
            {
                dto.WarehouseName = $"Warehouse {inventory.WarehouseId}";
            }

            return dto;
        }
    }
}