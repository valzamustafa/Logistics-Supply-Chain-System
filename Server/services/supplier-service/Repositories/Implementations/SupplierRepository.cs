using Microsoft.EntityFrameworkCore;
using SupplierService.Data;
using SupplierService.Models;
using SupplierService.Repositories.Interfaces;

namespace SupplierService.Repositories.Implementations
{
    public class SupplierRepository : ISupplierRepository
    {
        private readonly SupplierDbContext _context;

        public SupplierRepository(SupplierDbContext context)
        {
            _context = context;
        }

        public async Task<Supplier?> GetByIdAsync(int id)
        {
            return await _context.Suppliers.FindAsync(id);
        }

        public async Task<IEnumerable<Supplier>> GetAllAsync()
        {
            return await _context.Suppliers.ToListAsync();
        }

        public async Task<Supplier> CreateAsync(Supplier supplier)
        {
            _context.Suppliers.Add(supplier);
            await _context.SaveChangesAsync();
            return supplier;
        }

        public async Task<Supplier> UpdateAsync(Supplier supplier)
        {
            _context.Entry(supplier).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return supplier;
        }

        public async Task DeleteAsync(int id)
        {
            var supplier = await GetByIdAsync(id);
            if (supplier != null)
            {
                _context.Suppliers.Remove(supplier);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<SupplierOrder?> GetOrderByIdAsync(int id)
        {
            return await _context.SupplierOrders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == id);
        }

        public async Task<IEnumerable<SupplierOrder>> GetAllOrdersAsync()
        {
            return await _context.SupplierOrders
                .Include(o => o.Items)
                .ToListAsync();
        }

        public async Task<SupplierOrder> CreateOrderAsync(SupplierOrder order)
        {
            order.OrderNumber = GenerateOrderNumber();
            order.OrderDate = DateTime.UtcNow;
            order.Status = "Pending";
            _context.SupplierOrders.Add(order);
            await _context.SaveChangesAsync();
            return order;
        }

        private string GenerateOrderNumber()
        {
            return $"PO-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(1000, 9999)}";
        }
    }
}