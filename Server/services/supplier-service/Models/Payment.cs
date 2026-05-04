using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SupplierService.Models
{
    public class Payment : BaseEntity
    {
        [Required]
        public int PurchaseOrderId { get; set; }

        [Required]
        public decimal Amount { get; set; }

        [Required, MaxLength(50)]
        public string PaymentMethod { get; set; } = string.Empty;

        [Required, MaxLength(50)]
        public string Status { get; set; } = "Pending";

        [MaxLength(100)]
        public string? TransactionId { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }

        public DateTime PaymentDate { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(PurchaseOrderId))]
        public virtual PurchaseOrder? PurchaseOrder { get; set; }
    }
}