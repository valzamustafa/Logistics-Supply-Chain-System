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

        Task<PurchaseOrder?> GetPurchaseOrderByIdAsync(int id);
        Task<IEnumerable<PurchaseOrder>> GetAllPurchaseOrdersAsync();
        Task<PurchaseOrder> CreatePurchaseOrderAsync(PurchaseOrder order);
        Task<PurchaseOrder?> GetPurchaseOrderByNumberAsync(string poNumber);
        Task<PurchaseOrder> UpdatePurchaseOrderAsync(PurchaseOrder purchaseOrder);
        Task<IEnumerable<PurchaseOrder>> GetPurchaseOrdersBySupplierIdAsync(int supplierId);
        Task<Supplier?> GetSupplierByEmailAsync(string email);

        Task<SupplierRequest> CreateSupplierRequestAsync(SupplierRequest request);
        Task<IEnumerable<SupplierRequest>> GetPendingSupplierRequestsAsync();

        Task<SupplierInvitation> CreateSupplierInvitationAsync(SupplierInvitation invitation);
        Task<SupplierInvitation?> GetPendingInvitationByTokenAsync(string token);
        Task<SupplierInvitation> UpdateSupplierInvitationAsync(SupplierInvitation invitation);

        Task<EmergencyPurchase> CreateEmergencyPurchaseAsync(EmergencyPurchase purchase);
        Task<EmergencyPurchase?> GetEmergencyPurchaseByIdAsync(int id);
        Task<EmergencyPurchase> UpdateEmergencyPurchaseAsync(EmergencyPurchase purchase);
    }
}