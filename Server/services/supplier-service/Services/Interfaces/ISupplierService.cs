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
        Task<SupplierOrderDto?> UpdateSupplierOrderStatusAsync(int id, string status);

        Task<IEnumerable<PurchaseOrderDto>> GetAllPurchaseOrdersAsync();
        Task<PurchaseOrderDto?> GetPurchaseOrderByIdAsync(int id);
        Task<PurchaseOrderDto> CreatePurchaseOrderAsync(CreatePurchaseOrderDto dto);
        Task<PurchaseOrderDto?> UpdatePurchaseOrderStatusAsync(int id, UpdatePurchaseOrderStatusDto dto);
        Task<PurchaseOrderDto?> ConfirmShipmentAsync(int id, ShipmentConfirmationDto dto);
        Task<PurchaseOrderDto?> ReceivePurchaseOrderAsync(ReceivePurchaseOrderDto dto);
        
        Task<SupplierDto?> GetSupplierByEmailAsync(string email);
        Task<SupplierDashboardDto?> GetSupplierDashboardAsync(string email);

        Task<SupplierRequestDto> RequestNewSupplierAsync(CreateSupplierRequestDto dto);
        Task<IEnumerable<SupplierRequestDto>> GetPendingSupplierRequestsAsync();

        Task<SupplierInvitationDto> InviteSupplierAsync(CreateSupplierInvitationDto dto);
        Task<SupplierDto?> RegisterWithInvitationAsync(SupplierRegistrationDto dto);

        Task<EmergencyPurchaseDto> CreateEmergencyPurchaseAsync(CreateEmergencyPurchaseDto dto);
        Task<EmergencyPurchaseDto> ConvertEmergencyPurchaseAsync(int id, ConvertEmergencyPurchaseDto dto);

        Task<SupplierDto?> AssignSupplierToWarehouseAsync(int supplierId, int warehouseId);
        Task<PaymentResponseDto> CreatePaymentAsync(CreatePaymentDto dto);
        Task<IEnumerable<PaymentResponseDto>> GetPaymentsByPurchaseOrderAsync(int purchaseOrderId);
        Task<byte[]> GenerateInvoicePdfAsync(int purchaseOrderId);
        Task<PaymentResponseDto?> GetPaymentByIdAsync(int id);
    }
}