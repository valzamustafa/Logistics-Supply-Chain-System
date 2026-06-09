using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using WarehouseService.DTOs;
using WarehouseService.Models;
using WarehouseService.Repositories.Interfaces;
using WarehouseService.Services.Interfaces;

namespace WarehouseService.Business
{
    public class WarehouseService : IWarehouseService
    {
        private readonly IWarehouseRepository _repository;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly string[] _productServiceBaseUrls;
        private readonly ILogger<WarehouseService> _logger;
        private readonly IWarehouseNotificationService _notificationService;

        public WarehouseService(
            IWarehouseRepository repository,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<WarehouseService> logger,
            IWarehouseNotificationService notificationService)
        {
            _repository = repository;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _notificationService = notificationService;

            var configuredProductService = configuration["Services:ProductService"]?.TrimEnd('/') ?? "http://localhost:5000";
            _productServiceBaseUrls = new[]
            {
                $"{configuredProductService}/api/products",
                $"{configuredProductService}/api/product",
                "http://product-service/api/products",
                "http://product-service:80/api/products",
                "http://localhost:5002/api/products"
            };

            _logger.LogInformation($"Product Service base URLs configured: {string.Join(", ", _productServiceBaseUrls)}");
        }

      
        public async Task<IEnumerable<WarehouseDto>> GetAllWarehousesAsync()
        {
            var warehouses = await _repository.GetAllWarehousesAsync();
            return warehouses.Select(MapToDto);
        }

        public async Task<WarehouseDto?> GetWarehouseByIdAsync(int id)
        {
            var warehouse = await _repository.GetWarehouseByIdAsync(id);
            return warehouse == null ? null : MapToDto(warehouse);
        }

        public async Task<WarehouseDto> CreateWarehouseAsync(CreateWarehouseDto dto)
        {
            var warehouse = new Warehouse
            {
                Name = dto.Name,
                Location = dto.Location,
                Phone = dto.Phone,
                IsActive = true,
                CreatedBy = 1,
                UpdatedBy = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            var created = await _repository.CreateWarehouseAsync(warehouse);

            await _notificationService.NotifyWarehouseCreatedAsync(created.Id, created.Name, created.Location ?? string.Empty);

            return MapToDto(created);
        }

        public async Task<WarehouseDto> UpdateWarehouseAsync(int id, UpdateWarehouseDto dto)
        {
            var warehouse = await _repository.GetWarehouseByIdAsync(id);
            if (warehouse == null)
                throw new InvalidOperationException("Warehouse not found");

            warehouse.Name = dto.Name;
            warehouse.Location = dto.Location;
            warehouse.Phone = dto.Phone;
            warehouse.IsActive = dto.IsActive;
            warehouse.UpdatedAt = DateTime.UtcNow;
            warehouse.UpdatedBy = 1;

            var updated = await _repository.UpdateWarehouseAsync(warehouse);

            await _notificationService.NotifyWarehouseUpdatedAsync(updated.Id, updated.Name, updated.Location ?? string.Empty);

            return MapToDto(updated);
        }

        public async Task<bool> DeleteWarehouseAsync(int id)
        {
            var stock = await _repository.GetStockByWarehouseAsync(id);
            if (stock.Any(s => s.Quantity > 0))
                throw new InvalidOperationException("Cannot delete warehouse with existing stock. Transfer or remove stock first.");

            var warehouse = await _repository.GetWarehouseByIdAsync(id);
            if (warehouse == null)
                return false;

            await _repository.DeleteWarehouseAsync(id);

            await _notificationService.NotifyWarehouseDeletedAsync(warehouse.Name, warehouse.Location ?? string.Empty);

            return true;
        }

        public async Task<bool> ToggleWarehouseStatusAsync(int id, bool isActive)
        {
            var warehouse = await _repository.GetWarehouseByIdAsync(id);
            if (warehouse == null)
                return false;

            warehouse.IsActive = isActive;
            warehouse.UpdatedAt = DateTime.UtcNow;
            await _repository.UpdateWarehouseAsync(warehouse);

            await _notificationService.NotifyWarehouseStatusChangedAsync(warehouse.Id, warehouse.Name, isActive);

            return true;
        }

        public async Task<WarehouseStatsDto> GetWarehouseStatsAsync(int warehouseId)
        {
            var stock = await _repository.GetStockByWarehouseAsync(warehouseId);
            var zones = await _repository.GetZonesByWarehouseAsync(warehouseId);
            var staff = await _repository.GetStaffByWarehouseAsync(warehouseId);

            return new WarehouseStatsDto
            {
                TotalProducts = stock.Count(),
                TotalQuantity = stock.Sum(s => s.Quantity),
                LowStockCount = stock.Count(s => s.Quantity <= s.MinimumStockLevel && s.Quantity > 0),
                OutOfStockCount = stock.Count(s => s.Quantity <= 0),
                ZonesCount = zones.Count(),
                StaffCount = staff.Count()
            };
        }


        public async Task<IEnumerable<WarehouseZoneDto>> GetZonesByWarehouseAsync(int warehouseId)
        {
            var zones = await _repository.GetZonesByWarehouseAsync(warehouseId);
            return zones.Select(MapToZoneDto);
        }

        public async Task<WarehouseZoneDto> CreateZoneAsync(CreateWarehouseZoneDto dto)
        {
            var zone = new WarehouseZone
            {
                WarehouseId = dto.WarehouseId,
                ZoneName = dto.ZoneName,
                Description = dto.Description,
                Capacity = dto.Capacity,
                CreatedBy = 1,
                UpdatedBy = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            var created = await _repository.CreateZoneAsync(zone);

            var warehouse = await _repository.GetWarehouseByIdAsync(dto.WarehouseId);
            if (warehouse != null)
            {
                await _notificationService.NotifyZoneCreatedAsync(created.ZoneName, warehouse.Name, created.Capacity);
            }

            return MapToZoneDto(created);
        }

        public async Task<WarehouseZoneDto> UpdateZoneAsync(int id, UpdateWarehouseZoneDto dto)
        {
            var zone = await _repository.GetZoneByIdAsync(id);
            if (zone == null)
                throw new KeyNotFoundException($"Zone {id} not found");

            zone.ZoneName = dto.ZoneName;
            zone.Description = dto.Description;
            zone.Capacity = dto.Capacity;
            zone.UpdatedAt = DateTime.UtcNow;
            zone.UpdatedBy = 1;

            var updated = await _repository.UpdateZoneAsync(zone);
            return MapToZoneDto(updated);
        }

        public async Task<bool> DeleteZoneAsync(int id)
        {
            var zone = await _repository.GetZoneByIdAsync(id);
            if (zone == null)
                return false;

            var warehouse = await _repository.GetWarehouseByIdAsync(zone.WarehouseId);
            if (warehouse != null)
            {
                await _notificationService.NotifyZoneDeletedAsync(zone.ZoneName, warehouse.Name);
            }

            await _repository.DeleteZoneAsync(id);
            return true;
        }


        public async Task<IEnumerable<WarehouseStaffDto>> GetStaffByWarehouseAsync(int warehouseId)
        {
            var staff = await _repository.GetStaffByWarehouseAsync(warehouseId);
            return staff.Select(MapToStaffDto);
        }

        public async Task<WarehouseStaffDto> AssignStaffAsync(int warehouseId, AssignStaffDto dto)
        {
            var staff = new WarehouseStaff
            {
                UserId = dto.UserId,
                WarehouseId = warehouseId,
                Position = dto.Position,
                HireDate = dto.HireDate ?? DateTime.UtcNow,
                CreatedBy = 1,
                UpdatedBy = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            var created = await _repository.AssignStaffAsync(staff);

            var warehouse = await _repository.GetWarehouseByIdAsync(warehouseId);
            if (warehouse != null)
            {
                await _notificationService.NotifyStaffAssignedAsync(dto.UserId, warehouse.Name, dto.Position ?? string.Empty);
            }

            return MapToStaffDto(created);
        }

        public async Task<WarehouseStaffDto> UpdateStaffAsync(int id, AssignStaffDto dto)
        {
            var staff = await _repository.GetStaffByIdAsync(id);
            if (staff == null)
                throw new KeyNotFoundException($"Staff member {id} not found");

            if (dto.UserId != 0)
            {
                staff.UserId = dto.UserId;
            }
            staff.Position = dto.Position ?? staff.Position;
            staff.HireDate = dto.HireDate ?? staff.HireDate;
            staff.UpdatedAt = DateTime.UtcNow;
            staff.UpdatedBy = 1;

            var updated = await _repository.UpdateStaffAsync(staff);
            return MapToStaffDto(updated);
        }

        public async Task<IEnumerable<WarehouseStaffDto>> GetStaffByUserAsync(int userId)
        {
            var staff = await _repository.GetStaffByUserAsync(userId);
            return staff.Select(MapToStaffDto);
        }

        public async Task<bool> RemoveStaffAsync(int id)
        {
            var staff = await _repository.GetStaffByIdAsync(id);
            if (staff == null)
                return false;

            var warehouse = await _repository.GetWarehouseByIdAsync(staff.WarehouseId);
            if (warehouse != null)
            {
                await _notificationService.NotifyStaffRemovedAsync(staff.UserId, warehouse.Name);
            }

            await _repository.RemoveStaffAsync(id);
            return true;
        }

      
        public async Task<IEnumerable<WarehouseStockDto>> GetAllStockAsync()
        {
            var stock = await _repository.GetAllStockAsync();
            var enrichedStock = await EnrichStockWithProductInfo(stock);
            return enrichedStock.Select(MapToStockDto);
        }

        public async Task<WarehouseStockDto?> GetStockByIdAsync(int id)
        {
            var stock = await _repository.GetStockByIdAsync(id);
            if (stock == null) return null;
            var enriched = await EnrichStockWithProductInfo(new[] { stock });
            return MapToStockDto(enriched.First());
        }

        public async Task<IEnumerable<WarehouseStockDto>> GetStockByWarehouseAsync(int warehouseId)
        {
            var stock = await _repository.GetStockByWarehouseAsync(warehouseId);
            var enriched = await EnrichStockWithProductInfo(stock);
            return enriched.Select(MapToStockDto);
        }

        public async Task<IEnumerable<WarehouseStockDto>> GetStockByProductAsync(int productId)
        {
            var stock = await _repository.GetStockByProductAsync(productId);
            var enriched = await EnrichStockWithProductInfo(stock);
            return enriched.Select(MapToStockDto);
        }

        public async Task<WarehouseStockDto> AssignProductToWarehouseAsync(int warehouseId, AssignProductToWarehouseDto dto)
        {
            _logger.LogInformation($"Assigning product {dto.ProductId} to warehouse {warehouseId}");

            var warehouse = await _repository.GetWarehouseByIdAsync(warehouseId);
            if (warehouse == null)
                throw new InvalidOperationException($"Warehouse with ID {warehouseId} not found");

            var existing = await _repository.GetStockByWarehouseAndProductAsync(warehouseId, dto.ProductId);
            if (existing != null)
                throw new InvalidOperationException($"Product already assigned to this warehouse");

            var productInfo = await GetProductFromProductService(dto.ProductId);

            var stock = new WarehouseStock
            {
                WarehouseId = warehouseId,
                ProductId = dto.ProductId,
                Quantity = dto.InitialQuantity,
                MinimumStockLevel = dto.MinimumStockLevel,
                MaximumStockLevel = dto.MaximumStockLevel,
                ShelfLocation = dto.ShelfLocation,
                CreatedBy = 1,
                UpdatedBy = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var created = await _repository.CreateStockAsync(stock);

            if (dto.InitialQuantity > 0)
            {
                var movement = new StockMovement
                {
                    WarehouseStockId = created.Id,
                    ProductId = dto.ProductId,
                    Type = MovementType.Inbound,
                    Quantity = dto.InitialQuantity,
                    PreviousQuantity = 0,
                    NewQuantity = dto.InitialQuantity,
                    Reference = "Initial stock setup",
                    CreatedBy = 1,
                    UpdatedBy = 1,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await _repository.CreateStockMovementAsync(movement);
            }

            if (productInfo != null)
            {
                created.ProductName = productInfo.Name;
                created.ProductSku = productInfo.Sku;
            }
            else
            {
                created.ProductName = $"Product {dto.ProductId}";
                created.ProductSku = $"SKU-{dto.ProductId}";
            }

            _logger.LogInformation($"Product {dto.ProductId} assigned successfully to warehouse {warehouseId}");

            if (warehouse != null)
            {
                await _notificationService.NotifyProductAssignedAsync(warehouseId, warehouse.Name, created.ProductName, dto.InitialQuantity);
            }

            var enriched = await EnrichStockWithProductInfo(new[] { created });
            return MapToStockDto(enriched.First());
        }

        public async Task<WarehouseStockDto> UpdateStockAsync(int warehouseId, int productId, UpdateStockDto dto)
        {
            var stock = await _repository.GetStockByWarehouseAndProductAsync(warehouseId, productId);
            if (stock == null)
                throw new InvalidOperationException($"Product not found in warehouse");
            
            var previousQuantity = stock.Quantity;
            
            switch (dto.Type)
            {
                case MovementType.Inbound:
                case MovementType.Restock:
                    stock.Quantity += dto.Quantity;
                    break;
                case MovementType.Outbound:
                    if (stock.Quantity < dto.Quantity)
                        throw new InvalidOperationException($"Insufficient stock. Available: {stock.Quantity}, Requested: {dto.Quantity}");
                    stock.Quantity -= dto.Quantity;
                    break;
                case MovementType.Adjustment:
                    stock.Quantity = dto.Quantity;
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported movement type for direct update");
            }
            
            stock.UpdatedAt = DateTime.UtcNow;
            stock.UpdatedBy = 1;
            
            var updated = await _repository.UpdateStockAsync(stock);
            
            var movement = new StockMovement
            {
                WarehouseStockId = updated.Id,
                ProductId = productId,
                Type = dto.Type,
                Quantity = Math.Abs(dto.Quantity),
                PreviousQuantity = previousQuantity,
                NewQuantity = updated.Quantity,
                Reference = dto.Reference,
                Notes = dto.Notes,
                CreatedBy = 1,
                UpdatedBy = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _repository.CreateStockMovementAsync(movement);

            var warehouse = await _repository.GetWarehouseByIdAsync(warehouseId);
            if (warehouse != null)
            {
                var productName = stock.ProductName ?? $"Product {productId}";
                await _notificationService.NotifyStockUpdatedAsync(warehouseId, warehouse.Name, productName, previousQuantity, updated.Quantity, dto.Type.ToString());

               
                if (updated.Quantity <= updated.MinimumStockLevel && updated.Quantity > 0)
                {
                    var deficit = updated.MinimumStockLevel - updated.Quantity;
                    await _notificationService.NotifyLowStockAlertAsync(warehouseId, warehouse.Name, productName, updated.Quantity, updated.MinimumStockLevel, deficit);
                }
        
                if (updated.Quantity <= 0)
                {
                    await _notificationService.NotifyOutOfStockAlertAsync(warehouseId, warehouse.Name, productName);
                }

               
                if (updated.Quantity >= updated.MaximumStockLevel)
                {
                    await _notificationService.NotifyOverstockAlertAsync(warehouseId, warehouse.Name, productName, updated.Quantity, updated.MaximumStockLevel);
                }
            }
            
            var enriched = await EnrichStockWithProductInfo(new[] { updated });
            return MapToStockDto(enriched.First());
        }

        public async Task<bool> RemoveProductFromWarehouseAsync(int warehouseId, int productId)
        {
            var stock = await _repository.GetStockByWarehouseAndProductAsync(warehouseId, productId);
            if (stock == null)
                return false;

            var warehouse = await _repository.GetWarehouseByIdAsync(warehouseId);
            if (warehouse != null)
            {
                var productName = stock.ProductName ?? $"Product {productId}";
                await _notificationService.NotifyProductRemovedAsync(warehouseId, warehouse.Name, productName);
            }

            await _repository.DeleteStockAsync(stock.Id);
            return true;
        }

        public async Task<WarehouseStockDto> TransferStockAsync(TransferStockDto dto)
        {
            if (dto.SourceWarehouseId == dto.DestinationWarehouseId)
                throw new InvalidOperationException("Source and destination warehouses must be different");
            
            var sourceStock = await _repository.GetStockByWarehouseAndProductAsync(dto.SourceWarehouseId, dto.ProductId);
            if (sourceStock == null)
                throw new InvalidOperationException($"Product not found in source warehouse");
            
            if (sourceStock.Quantity < dto.Quantity)
                throw new InvalidOperationException($"Insufficient stock in source warehouse. Available: {sourceStock.Quantity}, Requested: {dto.Quantity}");
            
            var destStock = await _repository.GetStockByWarehouseAndProductAsync(dto.DestinationWarehouseId, dto.ProductId);
            var previousDestQuantity = destStock?.Quantity ?? 0;
            
            sourceStock.Quantity -= dto.Quantity;
            sourceStock.UpdatedAt = DateTime.UtcNow;
            sourceStock.UpdatedBy = 1;
            await _repository.UpdateStockAsync(sourceStock);
            
            var transferReference = $"TRF_{DateTime.UtcNow.Ticks}";
            var sourceMovement = new StockMovement
            {
                WarehouseStockId = sourceStock.Id,
                ProductId = dto.ProductId,
                Type = MovementType.Transfer,
                Quantity = dto.Quantity,
                PreviousQuantity = sourceStock.Quantity + dto.Quantity,
                NewQuantity = sourceStock.Quantity,
                Reference = transferReference,
                DestinationWarehouseId = dto.DestinationWarehouseId,
                Notes = dto.Notes,
                CreatedBy = 1,
                UpdatedBy = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _repository.CreateStockMovementAsync(sourceMovement);
            
            if (destStock == null)
            {
                destStock = new WarehouseStock
                {
                    WarehouseId = dto.DestinationWarehouseId,
                    ProductId = dto.ProductId,
                    Quantity = dto.Quantity,
                    MinimumStockLevel = sourceStock.MinimumStockLevel,
                    MaximumStockLevel = sourceStock.MaximumStockLevel,
                    ShelfLocation = sourceStock.ShelfLocation,
                    CreatedBy = 1,
                    UpdatedBy = 1,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                destStock = await _repository.CreateStockAsync(destStock);
            }
            else
            {
                destStock.Quantity += dto.Quantity;
                destStock.UpdatedAt = DateTime.UtcNow;
                destStock.UpdatedBy = 1;
                await _repository.UpdateStockAsync(destStock);
            }
            
            var destMovement = new StockMovement
            {
                WarehouseStockId = destStock.Id,
                ProductId = dto.ProductId,
                Type = MovementType.TransferIn,
                Quantity = dto.Quantity,
                PreviousQuantity = previousDestQuantity,
                NewQuantity = destStock.Quantity,
                Reference = transferReference,
                SourceWarehouseId = dto.SourceWarehouseId,
                Notes = dto.Notes,
                CreatedBy = 1,
                UpdatedBy = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _repository.CreateStockMovementAsync(destMovement);
            
            var sourceWarehouse = await _repository.GetWarehouseByIdAsync(dto.SourceWarehouseId);
            var destWarehouse = await _repository.GetWarehouseByIdAsync(dto.DestinationWarehouseId);
            if (sourceWarehouse != null && destWarehouse != null)
            {
                var productName = sourceStock.ProductName ?? $"Product {dto.ProductId}";
                await _notificationService.NotifyStockTransferredAsync(sourceWarehouse.Name, destWarehouse.Name, productName, dto.Quantity);
            }
            
            var enriched = await EnrichStockWithProductInfo(new[] { destStock });
            return MapToStockDto(enriched.First());
        }

        public async Task<IEnumerable<StockMovementDto>> GetStockMovementsAsync(int warehouseId, int productId, int? limit = null)
        {
            var stock = await _repository.GetStockByWarehouseAndProductAsync(warehouseId, productId);
            if (stock == null)
                return Enumerable.Empty<StockMovementDto>();
            
            var movements = await _repository.GetStockMovementsAsync(stock.Id, limit);
            var enrichedMovements = await EnrichMovementsWithWarehouseNames(movements);
            return enrichedMovements.Select(MapToMovementDto);
        }

        public async Task<IEnumerable<LowStockAlertDto>> GetLowStockAlertsAsync(int? warehouseId = null)
        {
            var lowStockItems = await _repository.GetLowStockItemsAsync(warehouseId);
            var enriched = await EnrichStockWithProductInfo(lowStockItems);
            
            return enriched.Select(item => new LowStockAlertDto
            {
                WarehouseId = item.WarehouseId,
                WarehouseName = item.Warehouse?.Name ?? "Unknown",
                ProductId = item.ProductId,
                ProductName = item.ProductName ?? $"Product {item.ProductId}",
                ProductSku = item.ProductSku ?? "N/A",
                CurrentQuantity = item.Quantity,
                MinimumLevel = item.MinimumStockLevel,
                Deficit = item.MinimumStockLevel - item.Quantity
            });
        }

        public async Task<bool> IsProductAvailableAsync(int warehouseId, int productId, int requestedQuantity)
        {
            var stock = await _repository.GetStockByWarehouseAndProductAsync(warehouseId, productId);
            return stock != null && stock.Quantity >= requestedQuantity;
        }

     
        private async Task<ProductInfo?> GetProductFromProductService(int productId)
        {
            foreach (var baseUrl in _productServiceBaseUrls.Distinct())
            {
                try
                {
                    var client = _httpClientFactory.CreateClient();
                    client.Timeout = TimeSpan.FromSeconds(5);
                    var url = $"{baseUrl.TrimEnd('/')}/{productId}";
                    
                    _logger.LogInformation($"Fetching product from: {url}");
                    var response = await client.GetAsync(url);
                    
                    if (!response.IsSuccessStatusCode)
                    {
                        _logger.LogWarning($"Product fetch returned {(int)response.StatusCode} from {url}");
                        continue;
                    }

                    var content = await response.Content.ReadAsStringAsync();
                    _logger.LogInformation($"Product response: {content}");
                    var product = JsonSerializer.Deserialize<ProductInfo>(content, new JsonSerializerOptions 
                    { 
                        PropertyNameCaseInsensitive = true 
                    });
                    
                    if (product != null && product.Id > 0)
                    {
                        _logger.LogInformation($"Successfully fetched product: {product.Name}");
                        return product;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning($"Error fetching from {baseUrl}: {ex.Message}");
                }
            }

            _logger.LogWarning($"Product {productId} not found, creating with default values");
            return new ProductInfo
            {
                Id = productId,
                Name = $"Product {productId}",
                Sku = $"SKU-{productId}",
                Price = 0,
                IsActive = true
            };
        }
        
        private async Task<List<WarehouseStock>> EnrichStockWithProductInfo(IEnumerable<WarehouseStock> stockItems)
        {
            var result = new List<WarehouseStock>();
            
            foreach (var item in stockItems)
            {
                try
                {
                    var productInfo = await GetProductFromProductService(item.ProductId);
                    if (productInfo != null)
                    {
                        item.ProductName = productInfo.Name;
                        item.ProductSku = productInfo.Sku;
                    }
                    else
                    {
                        item.ProductName = item.ProductName ?? $"Product {item.ProductId}";
                        item.ProductSku = item.ProductSku ?? $"SKU-{item.ProductId}";
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error enriching product {item.ProductId}");
                    item.ProductName = item.ProductName ?? $"Product {item.ProductId}";
                    item.ProductSku = item.ProductSku ?? $"SKU-{item.ProductId}";
                }
                result.Add(item);
            }
            
            return result;
        }

        private async Task<IEnumerable<StockMovement>> EnrichMovementsWithWarehouseNames(IEnumerable<StockMovement> movements)
        {
            var result = new List<StockMovement>();
            foreach (var movement in movements)
            {
                if (movement.SourceWarehouseId.HasValue)
                {
                    var warehouse = await _repository.GetWarehouseByIdAsync(movement.SourceWarehouseId.Value);
                    movement.SourceWarehouseName = warehouse?.Name;
                }
                if (movement.DestinationWarehouseId.HasValue)
                {
                    var warehouse = await _repository.GetWarehouseByIdAsync(movement.DestinationWarehouseId.Value);
                    movement.DestinationWarehouseName = warehouse?.Name;
                }
                result.Add(movement);
            }
            return result;
        }

    
        private WarehouseDto MapToDto(Warehouse warehouse)
        {
            return new WarehouseDto
            {
                Id = warehouse.Id,
                Name = warehouse.Name,
                Location = warehouse.Location,
                Phone = warehouse.Phone,
                IsActive = warehouse.IsActive,
                Zones = warehouse.Zones?.Select(MapToZoneDto).ToList() ?? new(),
                Staff = warehouse.Staff?.Select(MapToStaffDto).ToList() ?? new()
            };
        }

        private WarehouseZoneDto MapToZoneDto(WarehouseZone zone)
        {
            return new WarehouseZoneDto
            {
                Id = zone.Id,
                WarehouseId = zone.WarehouseId,
                ZoneName = zone.ZoneName,
                Description = zone.Description,
                Capacity = zone.Capacity
            };
        }

        private WarehouseStaffDto MapToStaffDto(WarehouseStaff staff)
        {
            return new WarehouseStaffDto
            {
                Id = staff.Id,
                UserId = staff.UserId,
                WarehouseId = staff.WarehouseId,
                Position = staff.Position,
                HireDate = staff.HireDate
            };
        }

        private WarehouseStockDto MapToStockDto(WarehouseStock stock)
        {
            return new WarehouseStockDto
            {
                Id = stock.Id,
                WarehouseId = stock.WarehouseId,
                WarehouseName = stock.Warehouse?.Name ?? "Unknown",
                ProductId = stock.ProductId,
                ProductName = stock.ProductName ?? $"Product {stock.ProductId}",
                ProductSku = stock.ProductSku ?? "N/A",
                Quantity = stock.Quantity,
                MinimumStockLevel = stock.MinimumStockLevel,
                MaximumStockLevel = stock.MaximumStockLevel,
                ShelfLocation = stock.ShelfLocation,
                IsLowStock = stock.Quantity <= stock.MinimumStockLevel && stock.Quantity > 0,
                IsOutOfStock = stock.Quantity <= 0,
                IsOverstock = stock.Quantity >= stock.MaximumStockLevel
            };
        }

        private StockMovementDto MapToMovementDto(StockMovement movement)
        {
            return new StockMovementDto
            {
                Id = movement.Id,
                ProductId = movement.ProductId,
                ProductName = movement.ProductName ?? $"Product {movement.ProductId}",
                Type = movement.Type,
                TypeName = movement.Type.ToString(),
                Quantity = movement.Quantity,
                PreviousQuantity = movement.PreviousQuantity,
                NewQuantity = movement.NewQuantity,
                Reference = movement.Reference,
                SourceWarehouseId = movement.SourceWarehouseId,
                SourceWarehouseName = movement.SourceWarehouseName,
                DestinationWarehouseId = movement.DestinationWarehouseId,
                DestinationWarehouseName = movement.DestinationWarehouseName,
                Notes = movement.Notes,
                CreatedAt = movement.CreatedAt,
                CreatedBy = movement.CreatedBy
            };
        }
    }
}