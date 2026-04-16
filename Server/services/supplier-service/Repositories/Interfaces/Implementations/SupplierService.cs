using SupplierService.DTOs;
using SupplierService.Models;
using SupplierService.Repositories.Interfaces;
using SupplierService.Services.Interfaces;

namespace SupplierService.Business
{
    public class SupplierService : ISupplierService
    {
        private readonly ISupplierRepository _repository;

        public SupplierService(ISupplierRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<SupplierDto>> GetAllSuppliersAsync()
        {
            var suppliers = await _repository.GetAllAsync();
            return suppliers.Select(MapToDto);
        }

        public async Task<SupplierDto?> GetSupplierByIdAsync(int id)
        {
            var supplier = await _repository.GetByIdAsync(id);
            return supplier == null ? null : MapToDto(supplier);
        }

        public async Task<SupplierDto> CreateSupplierAsync(CreateSupplierDto dto)
        {
            var supplier = new Supplier
            {
                Name = dto.Name,
                ContactPerson = dto.ContactPerson,
                Email = dto.Email,
                Phone = dto.Phone,
                Address = dto.Address,
                IsActive = true,
                CreatedBy = 1,
                UpdatedBy = 1
            };
            var created = await _repository.CreateAsync(supplier);
            return MapToDto(created);
        }

        public async Task<SupplierDto> UpdateSupplierAsync(int id, CreateSupplierDto dto)
        {
            var supplier = await _repository.GetByIdAsync(id);
            if (supplier == null)
                throw new InvalidOperationException("Supplier not found");

            supplier.Name = dto.Name;
            supplier.ContactPerson = dto.ContactPerson;
            supplier.Email = dto.Email;
            supplier.Phone = dto.Phone;
            supplier.Address = dto.Address;
            supplier.UpdatedAt = DateTime.UtcNow;

            var updated = await _repository.UpdateAsync(supplier);
            return MapToDto(updated);
        }

        public async Task<bool> DeleteSupplierAsync(int id)
        {
            var supplier = await _repository.GetByIdAsync(id);
            if (supplier == null)
                return false;

            await _repository.DeleteAsync(id);
            return true;
        }

        public async Task<IEnumerable<SupplierOrderDto>> GetAllOrdersAsync()
        {
            var orders = await _repository.GetAllOrdersAsync();
            var result = new List<SupplierOrderDto>();
            foreach (var order in orders)
                result.Add(await MapToOrderDto(order));
            return result;
        }

        public async Task<SupplierOrderDto?> GetOrderByIdAsync(int id)
        {
            var order = await _repository.GetOrderByIdAsync(id);
            return order == null ? null : await MapToOrderDto(order);
        }

        public async Task<SupplierOrderDto> CreateOrderAsync(CreateSupplierOrderDto dto)
        {
            var supplier = await _repository.GetByIdAsync(dto.SupplierId);
            if (supplier == null)
                throw new InvalidOperationException("Supplier not found");

            decimal totalAmount = 0;
            var items = new List<SupplierOrderItem>();

            foreach (var item in dto.Items)
            {
                var orderItem = new SupplierOrderItem
                {
                    ProductId = item.ProductId,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    CreatedBy = 1,
                    UpdatedBy = 1
                };
                totalAmount += item.Quantity * item.UnitPrice;
                items.Add(orderItem);
            }

            var order = new SupplierOrder
            {
                SupplierId = dto.SupplierId,
                TotalAmount = totalAmount,
                Items = items,
                CreatedBy = 1,
                UpdatedBy = 1
            };

            var created = await _repository.CreateOrderAsync(order);
            return await MapToOrderDto(created);
        }

        private SupplierDto MapToDto(Supplier supplier)
        {
            return new SupplierDto
            {
                Id = supplier.Id,
                Name = supplier.Name,
                ContactPerson = supplier.ContactPerson,
                Email = supplier.Email,
                Phone = supplier.Phone,
                Address = supplier.Address,
                IsActive = supplier.IsActive
            };
        }

        private async Task<SupplierOrderDto> MapToOrderDto(SupplierOrder order)
        {
            var supplier = await _repository.GetByIdAsync(order.SupplierId);
            return new SupplierOrderDto
            {
                Id = order.Id,
                SupplierId = order.SupplierId,
                SupplierName = supplier?.Name,
                OrderNumber = order.OrderNumber,
                OrderDate = order.OrderDate,
                TotalAmount = order.TotalAmount,
                Status = order.Status,
                Items = order.Items.Select(i => new SupplierOrderItemDto
                {
                    Id = i.Id,
                    ProductId = i.ProductId,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    TotalPrice = i.Quantity * i.UnitPrice
                }).ToList()
            };
        }
    }
}
