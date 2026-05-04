using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SupplierService.Models
{
    public class PurchaseOrderItem : BaseEntity
    {
        [Required]
        public int PurchaseOrderId { get; set; }

        [Required]
        public int ProductId { get; set; }

        [Required]
        public int Quantity { get; set; }

        public int QuantityReceived { get; set; } = 0;

        [Required]
        public decimal UnitPrice { get; set; }

        public decimal TotalPrice { get; set; }

        public virtual PurchaseOrder? PurchaseOrder { get; set; }
    }
}
