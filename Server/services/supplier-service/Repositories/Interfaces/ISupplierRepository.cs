using SupplierService.Models;

namespace SupplierService.Repositories.Interfaces
{
    public interface ISupplierRepository
    {
        Task<Supplier?> GetByIdAsync(int id);
        Task<IEnumerable<Supplier>> GetAllAsync();
        Task<Supplier> CreateAsync(Supplier supplier);
        Task<Supplier> UpdateAsync(Supplier supplier);
        Task DeleteAsync(int id);
        Task<SupplierOrder?> GetOrderByIdAsync(int id);
        Task<IEnumerable<SupplierOrder>> GetAllOrdersAsync();
        Task<SupplierOrder> CreateOrderAsync(SupplierOrder order);
    }
}