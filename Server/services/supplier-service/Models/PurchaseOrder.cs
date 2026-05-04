using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SupplierService.Models
{
    public class PurchaseOrder : BaseEntity
    {
        [Required]
        public int SupplierId { get; set; }

        [Required]
        public int WarehouseId { get; set; }

        [Required, MaxLength(50)]
        public string PONumber { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? InvoiceNumber { get; set; }

        public DateTime OrderDate { get; set; } = DateTime.UtcNow;
        public DateTime? ExpectedDeliveryDate { get; set; }
        public DateTime? ActualDeliveryDate { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "Pending";

        public decimal TotalAmount { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }

        public virtual Supplier? Supplier { get; set; }
        public virtual ICollection<PurchaseOrderItem> Items { get; set; } = new List<PurchaseOrderItem>();
    }
}
