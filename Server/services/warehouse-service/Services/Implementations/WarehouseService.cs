using System.Text.Json;
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
        private readonly string _productServiceUrl;

        public WarehouseService(IWarehouseRepository repository, IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            _repository = repository;
            _httpClientFactory = httpClientFactory;
            _productServiceUrl = configuration["Services:ProductService"] ?? "http://localhost:5001";
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
                UpdatedBy = 1
            };
            var created = await _repository.CreateWarehouseAsync(warehouse);
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
            return MapToDto(updated);
        }

        public async Task<bool> DeleteWarehouseAsync(int id)
        {
            var warehouse = await _repository.GetWarehouseByIdAsync(id);
            if (warehouse == null)
                return false;

            await _repository.DeleteWarehouseAsync(id);
            return true;
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
                UpdatedBy = 1
            };
            var created = await _repository.CreateZoneAsync(zone);
            return MapToZoneDto(created);
        }

        public async Task<bool> DeleteZoneAsync(int id)
        {
            var zone = await _repository.GetZoneByIdAsync(id);
            if (zone == null)
                return false;

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
                UpdatedBy = 1
            };
            var created = await _repository.AssignStaffAsync(staff);
            return MapToStaffDto(created);
        }

        public async Task<bool> RemoveStaffAsync(int id)
        {
            var staff = await _repository.GetStaffByIdAsync(id);
            if (staff == null)
                return false;

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
            var product = await GetProductFromProductService(dto.ProductId);
            if (product == null)
                throw new InvalidOperationException($"Product with ID {dto.ProductId} not found");
            
            var warehouse = await _repository.GetWarehouseByIdAsync(warehouseId);
            if (warehouse == null)
                throw new InvalidOperationException($"Warehouse with ID {warehouseId} not found");
            
            var existing = await _repository.GetStockByWarehouseAndProductAsync(warehouseId, dto.ProductId);
            if (existing != null)
                throw new InvalidOperationException($"Product already assigned to this warehouse");
            
            var stock = new WarehouseStock
            {
                WarehouseId = warehouseId,
                ProductId = dto.ProductId,
                Quantity = dto.InitialQuantity,
                MinimumStockLevel = dto.MinimumStockLevel,
                MaximumStockLevel = dto.MaximumStockLevel,
                ShelfLocation = dto.ShelfLocation,
                CreatedBy = 1,
                UpdatedBy = 1
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
                    UpdatedBy = 1
                };
                await _repository.CreateStockMovementAsync(movement);
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
                UpdatedBy = 1
            };
            await _repository.CreateStockMovementAsync(movement);
            
            var enriched = await EnrichStockWithProductInfo(new[] { updated });
            return MapToStockDto(enriched.First());
        }

        public async Task<bool> RemoveProductFromWarehouseAsync(int warehouseId, int productId)
        {
            var stock = await _repository.GetStockByWarehouseAndProductAsync(warehouseId, productId);
            if (stock == null)
                return false;
            
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
                UpdatedBy = 1
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
                    UpdatedBy = 1
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
                UpdatedBy = 1
            };
            await _repository.CreateStockMovementAsync(destMovement);
            
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
            try
            {
                var client = _httpClientFactory.CreateClient();
                var response = await client.GetAsync($"{_productServiceUrl}/api/products/{productId}");
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    return JsonSerializer.Deserialize<ProductInfo>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                }
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching product {productId}: {ex.Message}");
                return null;
            }
        }

        private async Task<List<WarehouseStock>> EnrichStockWithProductInfo(IEnumerable<WarehouseStock> stockItems)
        {
            var result = new List<WarehouseStock>();
            var client = _httpClientFactory.CreateClient();
            
            foreach (var item in stockItems)
            {
                try
                {
                    var response = await client.GetAsync($"{_productServiceUrl}/api/products/{item.ProductId}");
                    if (response.IsSuccessStatusCode)
                    {
                        var content = await response.Content.ReadAsStringAsync();
                        var product = JsonSerializer.Deserialize<ProductInfo>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        if (product != null)
                        {
                            item.ProductName = product.Name;
                            item.ProductSku = product.Sku;
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error enriching product {item.ProductId}: {ex.Message}");
                    item.ProductName = $"Product {item.ProductId}";
                    item.ProductSku = "N/A";
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
                IsLowStock = stock.Quantity <= stock.MinimumStockLevel,
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

    public class ProductInfo
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string? Description { get; set; }
        public int CategoryId { get; set; }
        public bool IsActive { get; set; }
    }
}