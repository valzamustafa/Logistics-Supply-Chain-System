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

        public async Task<PurchaseOrder?> GetPurchaseOrderByIdAsync(int id)
        {
            return await _context.PurchaseOrders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == id);
        }

        public async Task<IEnumerable<PurchaseOrder>> GetAllPurchaseOrdersAsync()
        {
            return await _context.PurchaseOrders
                .Include(o => o.Items)
                .ToListAsync();
        }

        public async Task<PurchaseOrder> CreatePurchaseOrderAsync(PurchaseOrder order)
        {
            order.PONumber = GenerateOrderNumber();
            order.OrderDate = DateTime.UtcNow;
            order.Status = "Pending";
            _context.PurchaseOrders.Add(order);
            await _context.SaveChangesAsync();
            return order;
        }

        public async Task<PurchaseOrder?> GetPurchaseOrderByNumberAsync(string poNumber)
        {
            return await _context.PurchaseOrders
                .Include(po => po.Items)
                .FirstOrDefaultAsync(po => po.PONumber == poNumber);
        }

        public async Task<PurchaseOrder> UpdatePurchaseOrderAsync(PurchaseOrder purchaseOrder)
        {
            _context.Entry(purchaseOrder).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return purchaseOrder;
        }

        public async Task<IEnumerable<PurchaseOrder>> GetPurchaseOrdersBySupplierIdAsync(int supplierId)
        {
            return await _context.PurchaseOrders
                .Include(po => po.Items)
                .Where(po => po.SupplierId == supplierId)
                .ToListAsync();
        }

        public async Task<Supplier?> GetSupplierByEmailAsync(string email)
        {
            return await _context.Suppliers
                .FirstOrDefaultAsync(s => s.Email != null && s.Email.ToLower() == email.ToLower());
        }

        public async Task<SupplierRequest> CreateSupplierRequestAsync(SupplierRequest request)
        {
            _context.SupplierRequests.Add(request);
            await _context.SaveChangesAsync();
            return request;
        }

        public async Task<IEnumerable<SupplierRequest>> GetPendingSupplierRequestsAsync()
        {
            return await _context.SupplierRequests
                .Where(r => r.Status == "Pending")
                .ToListAsync();
        }

        public async Task<SupplierInvitation> CreateSupplierInvitationAsync(SupplierInvitation invitation)
        {
            _context.SupplierInvitations.Add(invitation);
            await _context.SaveChangesAsync();
            return invitation;
        }

        public async Task<SupplierInvitation?> GetPendingInvitationByTokenAsync(string token)
        {
            return await _context.SupplierInvitations
                .FirstOrDefaultAsync(i => i.Token == token && i.Status == "Pending");
        }

        public async Task<SupplierInvitation> UpdateSupplierInvitationAsync(SupplierInvitation invitation)
        {
            _context.Entry(invitation).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return invitation;
        }

        public async Task<EmergencyPurchase> CreateEmergencyPurchaseAsync(EmergencyPurchase purchase)
        {
            _context.EmergencyPurchases.Add(purchase);
            await _context.SaveChangesAsync();
            return purchase;
        }

        public async Task<EmergencyPurchase?> GetEmergencyPurchaseByIdAsync(int id)
        {
            return await _context.EmergencyPurchases.FindAsync(id);
        }

        public async Task<EmergencyPurchase> UpdateEmergencyPurchaseAsync(EmergencyPurchase purchase)
        {
            _context.Entry(purchase).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return purchase;
        }

        private string GenerateOrderNumber()
        {
            return $"PO-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(1000, 9999)}";
        }
    }
}