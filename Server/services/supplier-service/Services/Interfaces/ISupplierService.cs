using SupplierService.DTOs;

namespace SupplierService.Services.Interfaces
{
    public interface ISupplierService
    {
        Task<IEnumerable<SupplierDto>> GetAllSuppliersAsync();
        Task<SupplierDto?> GetSupplierByIdAsync(int id);
        Task<SupplierDto> CreateSupplierAsync(CreateSupplierDto dto);
        Task<SupplierDto> UpdateSupplierAsync(int id, CreateSupplierDto dto);
        Task<bool> DeleteSupplierAsync(int id);
        
        Task<IEnumerable<SupplierOrderDto>> GetAllOrdersAsync();
        Task<SupplierOrderDto?> GetOrderByIdAsync(int id);
        Task<SupplierOrderDto> CreateOrderAsync(CreateSupplierOrderDto dto);
    }
}