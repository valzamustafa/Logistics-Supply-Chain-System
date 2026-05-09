using Microsoft.EntityFrameworkCore;
using SupplierService.Data;
using SupplierService.DTOs;
using SupplierService.Models;
using SupplierService.Repositories.Interfaces;
using SupplierService.Services.Interfaces;

namespace SupplierService.Services.Implementations
{
    public class SupplierService : ISupplierService
    {
        private readonly ISupplierRepository _repository;
        private readonly SupplierDbContext _context;

        public SupplierService(ISupplierRepository repository, SupplierDbContext context)
        {
            _repository = repository;
            _context = context;
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
                VatNumber = dto.VatNumber,
                Address = dto.Address,
                PaymentTerms = dto.PaymentTerms,
                CreditLimit = dto.CreditLimit ?? 0,
                IsApproved = dto.IsApproved,
                IsActive = true,
                CreatedBy = 1,
                UpdatedBy = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
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
            supplier.VatNumber = dto.VatNumber;
            supplier.Address = dto.Address;
            supplier.PaymentTerms = dto.PaymentTerms;
            supplier.CreditLimit = dto.CreditLimit ?? supplier.CreditLimit;
            supplier.IsApproved = dto.IsApproved;
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
            var orders = await _context.SupplierOrders
                .Include(o => o.Items)
                .ToListAsync();
            
            var result = new List<SupplierOrderDto>();
            foreach (var order in orders)
            {
                var supplier = await _repository.GetByIdAsync(order.SupplierId);
                result.Add(new SupplierOrderDto
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
                });
            }
            return result;
        }

        public async Task<SupplierOrderDto?> GetOrderByIdAsync(int id)
        {
            var order = await _context.SupplierOrders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == id);
            
            if (order == null) return null;
            
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
                    UpdatedBy = 1,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                totalAmount += item.Quantity * item.UnitPrice;
                items.Add(orderItem);
            }

            var order = new SupplierOrder
            {
                SupplierId = dto.SupplierId,
                OrderNumber = $"SO-{DateTime.UtcNow:yyyyMMddHHmmss}",
                OrderDate = DateTime.UtcNow,
                TotalAmount = totalAmount,
                Status = "Pending",
                Items = items,
                CreatedBy = 1,
                UpdatedBy = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.SupplierOrders.Add(order);
            await _context.SaveChangesAsync();
            
            return new SupplierOrderDto
            {
                Id = order.Id,
                SupplierId = order.SupplierId,
                SupplierName = supplier.Name,
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

        public async Task<SupplierOrderDto?> UpdateSupplierOrderStatusAsync(int id, string status)
        {
            var order = await _context.SupplierOrders.FindAsync(id);
            if (order == null) return null;

            order.Status = status;
            order.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

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
                    TotalPrice = i.TotalPrice
                }).ToList()
            };
        }

        public async Task<IEnumerable<PurchaseOrderDto>> GetAllPurchaseOrdersAsync()
        {
            var orders = await _context.PurchaseOrders
                .Include(o => o.Items)
                .ToListAsync();
            return orders.Select(MapToPurchaseOrderDto);
        }

        public async Task<PurchaseOrderDto?> GetPurchaseOrderByIdAsync(int id)
        {
            var order = await _context.PurchaseOrders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == id);
            return order == null ? null : MapToPurchaseOrderDto(order);
        }

        public async Task<PurchaseOrderDto> CreatePurchaseOrderAsync(CreatePurchaseOrderDto dto)
        {
            var supplier = await _repository.GetByIdAsync(dto.SupplierId);
            if (supplier == null)
                throw new InvalidOperationException("Supplier not found");

            decimal totalAmount = 0;
            var items = new List<PurchaseOrderItem>();

            foreach (var item in dto.Items)
            {
                var orderItem = new PurchaseOrderItem
                {
                    ProductId = item.ProductId,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    TotalPrice = item.Quantity * item.UnitPrice,
                    CreatedBy = 1,
                    UpdatedBy = 1,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                totalAmount += item.Quantity * item.UnitPrice;
                items.Add(orderItem);
            }

            var purchaseOrder = new PurchaseOrder
            {
                SupplierId = dto.SupplierId,
                WarehouseId = dto.WarehouseId,
                PONumber = $"PO-{DateTime.UtcNow:yyyyMMddHHmmss}",
                InvoiceNumber = !string.IsNullOrWhiteSpace(dto.InvoiceNumber)
                    ? dto.InvoiceNumber
                    : $"INV-{DateTime.UtcNow:yyyyMMddHHmmss}",
                OrderDate = DateTime.UtcNow,
                ExpectedDeliveryDate = dto.ExpectedDeliveryDate,
                Notes = dto.Notes,
                Status = "Pending",
                TotalAmount = totalAmount,
                Items = items,
                CreatedBy = 1,
                UpdatedBy = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.PurchaseOrders.Add(purchaseOrder);
            await _context.SaveChangesAsync();
            return MapToPurchaseOrderDto(purchaseOrder);
        }

        public async Task<IEnumerable<SupplierProductDto>> GetSupplierProductsBySupplierIdAsync(int supplierId)
        {
            var supplierProducts = await _repository.GetSupplierProductsBySupplierIdAsync(supplierId);
            return supplierProducts.Select(sp => new SupplierProductDto
            {
                Id = sp.Id,
                SupplierId = sp.SupplierId,
                ProductId = sp.ProductId,
                SupplierSKU = sp.SupplierSKU,
                LeadTimeDays = sp.LeadTimeDays
            });
        }

        public async Task<IEnumerable<SupplierProductDto>> GetAllSupplierProductsAsync()
        {
            var supplierProducts = await _repository.GetAllSupplierProductsAsync();
            return supplierProducts.Select(sp => new SupplierProductDto
            {
                Id = sp.Id,
                SupplierId = sp.SupplierId,
                ProductId = sp.ProductId,
                SupplierSKU = sp.SupplierSKU,
                LeadTimeDays = sp.LeadTimeDays
            });
        }

        public async Task<SupplierProductDto> AddSupplierProductAsync(int supplierId, CreateSupplierProductDto dto)
        {
            var supplier = await _repository.GetByIdAsync(supplierId);
            if (supplier == null)
                throw new InvalidOperationException("Supplier not found");

            var alreadyExists = await _context.SupplierProducts
                .AnyAsync(sp => sp.SupplierId == supplierId && sp.ProductId == dto.ProductId);
            if (alreadyExists)
                throw new InvalidOperationException("Product is already assigned to this supplier");

            var supplierProduct = new SupplierProduct
            {
                SupplierId = supplierId,
                ProductId = dto.ProductId,
                SupplierSKU = dto.SupplierSKU,
                LeadTimeDays = dto.LeadTimeDays,
                CreatedBy = 1,
                UpdatedBy = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var created = await _repository.CreateSupplierProductAsync(supplierProduct);
            return new SupplierProductDto
            {
                Id = created.Id,
                SupplierId = created.SupplierId,
                ProductId = created.ProductId,
                SupplierSKU = created.SupplierSKU,
                LeadTimeDays = created.LeadTimeDays
            };
        }

        public async Task<SupplierDto?> GetSupplierByEmailAsync(string email)
        {
            var supplier = await _context.Suppliers
                .FirstOrDefaultAsync(s => s.Email != null && s.Email.ToLower() == email.ToLower());
            return supplier == null ? null : MapToDto(supplier);
        }

      public async Task<SupplierDashboardDto?> GetSupplierDashboardAsync(string email)
{
    var supplier = await _context.Suppliers
        .FirstOrDefaultAsync(s => s.Email != null && s.Email.ToLower() == email.ToLower());
    
    if (supplier == null)
    {
        return null;
    }

    var purchaseOrders = await _context.PurchaseOrders
        .Include(o => o.Items)
        .Where(o => o.SupplierId == supplier.Id)
        .ToListAsync();

    var orderDtos = purchaseOrders.Select(MapToPurchaseOrderDto).ToList();
    var warehouseIds = purchaseOrders
        .Select(o => o.WarehouseId)
        .Distinct()
        .ToList();

    return new SupplierDashboardDto
    {
        SupplierId = supplier.Id,
        SupplierName = supplier.Name,
        SupplierEmail = supplier.Email,
        SupplierContactPerson = supplier.ContactPerson,
        SupplierPhone = supplier.Phone,
        WarehouseIds = warehouseIds,
        Orders = orderDtos
    };
}

        public async Task<SupplierDto> EnsureSupplierProfileAsync(string email, string name, string? contactPerson = null)
        {
            var existingSupplier = await _context.Suppliers
                .FirstOrDefaultAsync(s => s.Email != null && s.Email.ToLower() == email.ToLower());

            if (existingSupplier != null)
            {
                return MapToDto(existingSupplier);
            }

            var supplier = new CreateSupplierDto
            {
                Name = string.IsNullOrWhiteSpace(name) ? email : name,
                Email = email,
                ContactPerson = string.IsNullOrWhiteSpace(contactPerson) ? name : contactPerson,
                Phone = string.Empty,
                Address = string.Empty,
                VatNumber = string.Empty,
                PaymentTerms = string.Empty,
                CreditLimit = 0m,
                IsApproved = false
            };

            return await CreateSupplierAsync(supplier);
        }

        public async Task<SupplierRequestDto> RequestNewSupplierAsync(CreateSupplierRequestDto dto)
        {
            var request = new SupplierRequest
            {
                WarehouseId = dto.WarehouseId,
                RequestedBy = dto.RequestedBy,
                ProductCategory = dto.ProductCategory,
                ProductName = dto.ProductName,
                QuantityNeeded = dto.QuantityNeeded,
                Urgency = dto.Urgency ?? "Normal",
                Notes = dto.Notes,
                Status = "Pending",
                CreatedBy = dto.RequestedBy,
                UpdatedBy = dto.RequestedBy,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.SupplierRequests.Add(request);
            await _context.SaveChangesAsync();
            return MapToSupplierRequestDto(request);
        }

        public async Task<IEnumerable<SupplierRequestDto>> GetPendingSupplierRequestsAsync(string? supplierEmail = null)
        {
            try
            {
                IQueryable<SupplierRequest> query = _context.SupplierRequests
                    .Where(r => r.Status == "Pending");

                if (!string.IsNullOrEmpty(supplierEmail))
                {
                    var supplier = await _context.Suppliers
                        .FirstOrDefaultAsync(s => s.Email != null && s.Email.ToLower() == supplierEmail.ToLower());

                    if (supplier == null)
                    {
                        return Enumerable.Empty<SupplierRequestDto>();
                    }

                    var assignedWarehouseIds = await _context.SupplierWarehouseAssignments
                        .Where(a => a.SupplierId == supplier.Id && a.IsActive)
                        .Select(a => a.WarehouseId)
                        .Distinct()
                        .ToListAsync();

                    if (!assignedWarehouseIds.Any())
                    {
                        return Enumerable.Empty<SupplierRequestDto>();
                    }

                    query = query.Where(r => assignedWarehouseIds.Contains(r.WarehouseId));
                }

                var requests = await query.ToListAsync();
                return requests.Select(MapToSupplierRequestDto);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting pending supplier requests: {ex.Message}");
                return Enumerable.Empty<SupplierRequestDto>();
            }
        }

        public async Task<SupplierInvitationDto> InviteSupplierAsync(CreateSupplierInvitationDto dto)
        {
            var invitation = new SupplierInvitation
            {
                Email = dto.Email,
                WarehouseId = dto.WarehouseId,
                Token = Guid.NewGuid().ToString("N"),
                Status = "Pending",
                ExpiresAt = dto.ExpiresAt,
                CreatedBy = 1,
                UpdatedBy = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.SupplierInvitations.Add(invitation);
            await _context.SaveChangesAsync();
            return MapToSupplierInvitationDto(invitation);
        }

        public async Task<SupplierDto?> RegisterWithInvitationAsync(SupplierRegistrationDto dto)
        {
            var invitation = await _context.SupplierInvitations
                .FirstOrDefaultAsync(i => i.Token == dto.Token && i.Status == "Pending");
            
            if (invitation == null || invitation.ExpiresAt < DateTime.UtcNow)
                return null;

            var supplier = new Supplier
            {
                Name = dto.Name,
                ContactPerson = dto.ContactPerson,
                Email = invitation.Email,
                Phone = dto.Phone,
                Address = dto.Address,
                IsActive = true,
                IsApproved = false,
                CreatedBy = 1,
                UpdatedBy = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Suppliers.Add(supplier);
            await _context.SaveChangesAsync();
            
            invitation.Status = "Accepted";
            await _context.SaveChangesAsync();

            return MapToDto(supplier);
        }

        public async Task<EmergencyPurchaseDto> CreateEmergencyPurchaseAsync(CreateEmergencyPurchaseDto dto)
        {
            var emergency = new EmergencyPurchase
            {
                WarehouseId = dto.WarehouseId,
                ProductName = dto.ProductName,
                Quantity = dto.Quantity,
                SupplierName = dto.SupplierName,
                SupplierContact = dto.SupplierContact,
                InvoiceNumber = dto.InvoiceNumber,
                UnitPrice = dto.UnitPrice,
                TotalAmount = dto.Quantity * dto.UnitPrice,
                Reason = dto.Reason,
                IsResolved = false,
                CreatedBy = 1,
                UpdatedBy = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.EmergencyPurchases.Add(emergency);
            await _context.SaveChangesAsync();
            return MapToEmergencyPurchaseDto(emergency);
        }

        public async Task<EmergencyPurchaseDto> ConvertEmergencyPurchaseAsync(int id, ConvertEmergencyPurchaseDto dto)
        {
            var emergency = await _context.EmergencyPurchases.FindAsync(id);
            if (emergency == null)
                throw new InvalidOperationException("Emergency purchase not found");

            emergency.IsResolved = true;
            emergency.ResolvedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return MapToEmergencyPurchaseDto(emergency);
        }

    


public async Task<SupplierDto?> AssignSupplierToWarehouseAsync(int supplierId, int warehouseId)
{
    var supplier = await _repository.GetByIdAsync(supplierId);
    if (supplier == null) return null;

    var existingAssignment = await _context.SupplierWarehouseAssignments
        .FirstOrDefaultAsync(a => a.SupplierId == supplierId && a.WarehouseId == warehouseId);
    
    if (existingAssignment == null)
    {
        var assignment = new SupplierWarehouseAssignment
        {
            SupplierId = supplierId,
            WarehouseId = warehouseId,
            IsActive = true,
            AssignedDate = DateTime.UtcNow,
            CreatedBy = 1,
            UpdatedBy = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.SupplierWarehouseAssignments.Add(assignment);
        await _context.SaveChangesAsync();
    }
    
    return MapToDto(supplier);
}
public async Task<PaymentResponseDto?> GetPaymentByIdAsync(int id)
{
    var payment = await _context.Payments.FindAsync(id);
    if (payment == null) return null;

    return new PaymentResponseDto
    {
        Id = payment.Id,
        PurchaseOrderId = payment.PurchaseOrderId,
        Amount = payment.Amount,
        PaymentMethod = payment.PaymentMethod,
        Status = payment.Status,
        TransactionId = payment.TransactionId,
        PaymentDate = payment.PaymentDate
    };
}
     // SupplierService.cs - Shto këto metoda

public async Task<PurchaseOrderDto?> ConfirmShipmentAsync(int id, ConfirmShipmentRequestDto dto)
{
    var purchaseOrder = await _context.PurchaseOrders.FindAsync(id);
    if (purchaseOrder == null) return null;

    purchaseOrder.Status = "Shipped";
    purchaseOrder.ActualDeliveryDate = dto.ActualDeliveryDate ?? DateTime.UtcNow;
    purchaseOrder.Notes = dto.Notes ?? purchaseOrder.Notes;
    purchaseOrder.UpdatedAt = DateTime.UtcNow;
    
    await _context.SaveChangesAsync();
    return MapToPurchaseOrderDto(purchaseOrder);
}


        public async Task<PurchaseOrderDto?> ReceivePurchaseOrderAsync(ReceivePurchaseOrderDto dto)
        {
            var purchaseOrder = await _context.PurchaseOrders
                .FirstOrDefaultAsync(po => po.PONumber == dto.PONumber);
            if (purchaseOrder == null) return null;

            purchaseOrder.Status = "Received";
            purchaseOrder.ActualDeliveryDate = dto.ActualDeliveryDate ?? DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return MapToPurchaseOrderDto(purchaseOrder);
        }
                public async Task<PurchaseOrderDto?> UpdatePurchaseOrderStatusAsync(int id, UpdatePurchaseOrderStatusDto dto)
        {
            var purchaseOrder = await _context.PurchaseOrders.FindAsync(id);
            if (purchaseOrder == null) return null;

            purchaseOrder.Status = dto.Status;
            purchaseOrder.Notes = dto.Notes ?? purchaseOrder.Notes;
            purchaseOrder.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            return MapToPurchaseOrderDto(purchaseOrder);
        }

        public async Task<PaymentResponseDto> CreatePaymentAsync(CreatePaymentDto dto)
        {
            var purchaseOrder = await _context.PurchaseOrders.FindAsync(dto.PurchaseOrderId);
            if (purchaseOrder == null)
                throw new InvalidOperationException("Purchase order not found");

            var payment = new Payment
            {
                PurchaseOrderId = dto.PurchaseOrderId,
                Amount = dto.Amount,
                PaymentMethod = dto.PaymentMethod,
                TransactionId = dto.TransactionId,
                Notes = dto.Notes,
                Status = "Completed",
                PaymentDate = DateTime.UtcNow,
                CreatedBy = 1,
                UpdatedBy = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Payments.Add(payment);

            if (purchaseOrder.Status == "Pending" || purchaseOrder.Status == "Paid")
            {
                purchaseOrder.Status = "Purchased";
            }

            await _context.SaveChangesAsync();

            return new PaymentResponseDto
            {
                Id = payment.Id,
                PurchaseOrderId = payment.PurchaseOrderId,
                Amount = payment.Amount,
                PaymentMethod = payment.PaymentMethod,
                Status = payment.Status,
                TransactionId = payment.TransactionId,
                PaymentDate = payment.PaymentDate
            };
        }

        public async Task<IEnumerable<PaymentResponseDto>> GetPaymentsByPurchaseOrderAsync(int purchaseOrderId)
        {
            var payments = await _context.Payments
                .Where(p => p.PurchaseOrderId == purchaseOrderId)
                .OrderByDescending(p => p.PaymentDate)
                .ToListAsync();

            return payments.Select(p => new PaymentResponseDto
            {
                Id = p.Id,
                PurchaseOrderId = p.PurchaseOrderId,
                Amount = p.Amount,
                PaymentMethod = p.PaymentMethod,
                Status = p.Status,
                TransactionId = p.TransactionId,
                PaymentDate = p.PaymentDate
            });
        }

        public async Task<byte[]> GenerateInvoicePdfAsync(int purchaseOrderId)
        {
            var order = await _context.PurchaseOrders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == purchaseOrderId);

            if (order == null)
                throw new InvalidOperationException("Purchase order not found");

            var supplier = await _repository.GetByIdAsync(order.SupplierId);
            
            var pdfContent = $@"
                INVOICE
                =================================
                Order Number: {order.PONumber}
                Invoice Number: {order.InvoiceNumber}
                Date: {order.OrderDate:yyyy-MM-dd}
                Status: {order.Status}
                Supplier: {supplier?.Name}
                Total Amount: ${order.TotalAmount:F2}
                
                Items:
                {string.Join("\n", order.Items.Select(i => $"  - Product #{i.ProductId}: {i.Quantity} x ${i.UnitPrice:F2} = ${i.TotalPrice:F2}"))}
                
                Thank you for your business!
            ";
            
            return System.Text.Encoding.UTF8.GetBytes(pdfContent);
        }

        public async Task<PurchaseOrderDto?> ConfirmShipmentAsync(int id, ShipmentConfirmationDto dto)
        {
            var purchaseOrder = await _context.PurchaseOrders.FindAsync(id);
            if (purchaseOrder == null) return null;

            purchaseOrder.Status = "Shipped";
            purchaseOrder.ActualDeliveryDate = dto.ActualDeliveryDate ?? DateTime.UtcNow;
            purchaseOrder.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            return MapToPurchaseOrderDto(purchaseOrder);
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
                VatNumber = supplier.VatNumber,
                Address = supplier.Address,
                PaymentTerms = supplier.PaymentTerms,
                CreditLimit = supplier.CreditLimit,
                IsActive = supplier.IsActive,
                IsApproved = supplier.IsApproved
            };
        }

        private PurchaseOrderDto MapToPurchaseOrderDto(PurchaseOrder order)
        {
            return new PurchaseOrderDto
            {
                Id = order.Id,
                SupplierId = order.SupplierId,
                WarehouseId = order.WarehouseId,
                PONumber = order.PONumber,
                InvoiceNumber = !string.IsNullOrWhiteSpace(order.InvoiceNumber)
                    ? order.InvoiceNumber
                    : order.PONumber.StartsWith("PO-") ? order.PONumber.Replace("PO-", "INV-") : $"INV-{order.PONumber}",
                OrderDate = order.OrderDate,
                ExpectedDeliveryDate = order.ExpectedDeliveryDate,
                ActualDeliveryDate = order.ActualDeliveryDate,
                Status = order.Status,
                TotalAmount = order.TotalAmount,
                Notes = order.Notes,
                Items = order.Items.Select(i => new PurchaseOrderItemDto
                {
                    Id = i.Id,
                    ProductId = i.ProductId,
                    Quantity = i.Quantity,
                    QuantityReceived = i.QuantityReceived,
                    UnitPrice = i.UnitPrice,
                    TotalPrice = i.TotalPrice
                }).ToList()
            };
        }

        private SupplierRequestDto MapToSupplierRequestDto(SupplierRequest request)
        {
            return new SupplierRequestDto
            {
                Id = request.Id,
                WarehouseId = request.WarehouseId,
                RequestedBy = request.RequestedBy,
                ProductCategory = request.ProductCategory,
                ProductName = request.ProductName,
                QuantityNeeded = request.QuantityNeeded,
                Urgency = request.Urgency,
                Status = request.Status,
                Notes = request.Notes,
                CreatedAt = request.CreatedAt,
                ResolvedAt = request.ResolvedAt
            };
        }

        private SupplierInvitationDto MapToSupplierInvitationDto(SupplierInvitation invitation)
        {
            return new SupplierInvitationDto
            {
                Id = invitation.Id,
                Email = invitation.Email,
                WarehouseId = invitation.WarehouseId,
                Token = invitation.Token,
                Status = invitation.Status,
                ExpiresAt = invitation.ExpiresAt,
                CreatedAt = invitation.CreatedAt
            };
        }

        private EmergencyPurchaseDto MapToEmergencyPurchaseDto(EmergencyPurchase emergency)
        {
            return new EmergencyPurchaseDto
            {
                Id = emergency.Id,
                WarehouseId = emergency.WarehouseId,
                ProductName = emergency.ProductName,
                Quantity = emergency.Quantity,
                SupplierName = emergency.SupplierName,
                SupplierContact = emergency.SupplierContact,
                InvoiceNumber = emergency.InvoiceNumber,
                UnitPrice = emergency.UnitPrice,
                TotalAmount = emergency.TotalAmount,
                Reason = emergency.Reason,
                IsResolved = emergency.IsResolved,
                CreatedAt = emergency.CreatedAt,
                ResolvedAt = emergency.ResolvedAt
            };
        }
    }
}