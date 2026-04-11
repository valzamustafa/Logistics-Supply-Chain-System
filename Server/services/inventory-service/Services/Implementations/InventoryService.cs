using InventoryService.DTOs;
using InventoryService.Models;
using InventoryService.Repositories.Interfaces;
using InventoryService.Services.Interfaces;

namespace InventoryService.Business
{
    public class InventoryService : IInventoryService
    {
        private readonly IInventoryRepository _inventoryRepository;

        public InventoryService(IInventoryRepository inventoryRepository)
        {
            _inventoryRepository = inventoryRepository;
        }

        public async Task<InventoryDto?> GetInventoryAsync(int productId, int warehouseId)
        {
            var inventory = await _inventoryRepository.GetByProductAndWarehouseAsync(productId, warehouseId);
            return inventory == null ? null : MapToDto(inventory);
        }

        public async Task<IEnumerable<InventoryDto>> GetAllInventoryAsync()
        {
            var inventory = await _inventoryRepository.GetAllAsync();
            return inventory.Select(MapToDto);
        }

        public async Task<StockMovementDto> UpdateStockAsync(UpdateStockDto request)
        {
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

        private InventoryDto MapToDto(Inventory inventory)
        {
            return new InventoryDto
            {
                Id = inventory.Id,
                ProductId = inventory.ProductId,
                WarehouseId = inventory.WarehouseId,
                Quantity = inventory.Quantity,
                ReservedQuantity = inventory.ReservedQuantity,
                AvailableQuantity = inventory.Quantity - inventory.ReservedQuantity,
                ReorderLevel = inventory.ReorderLevel
            };
        }
    }
}

