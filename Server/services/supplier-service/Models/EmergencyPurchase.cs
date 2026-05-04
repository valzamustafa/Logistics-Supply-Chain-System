using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SupplierService.Models
{
    public class EmergencyPurchase : BaseEntity
    {
        [Required]
        public int WarehouseId { get; set; }

        [Required, MaxLength(200)]
        public string ProductName { get; set; } = string.Empty;

        [Required]
        public int Quantity { get; set; }

        [MaxLength(200)]
        public string? SupplierName { get; set; }

        [MaxLength(100)]
        public string? SupplierContact { get; set; }

        [MaxLength(50)]
        public string? InvoiceNumber { get; set; }

        public decimal? UnitPrice { get; set; }

        public decimal? TotalAmount { get; set; }

        [MaxLength(500)]
        public string? Reason { get; set; }

        public bool IsResolved { get; set; } = false;

        public DateTime? ResolvedAt { get; set; }
    }
}
