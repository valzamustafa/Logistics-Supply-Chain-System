using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SupplierService.Models
{
    public class SupplierRequest : BaseEntity
    {
        [Required]
        public int WarehouseId { get; set; }

        [Required]
        public int RequestedBy { get; set; }

        [MaxLength(100)]
        public string? ProductCategory { get; set; }

        [MaxLength(200)]
        public string? ProductName { get; set; }

        public int? QuantityNeeded { get; set; }

        [MaxLength(50)]
        public string Urgency { get; set; } = "Normal";

        [MaxLength(50)]
        public string Status { get; set; } = "Pending";

        [MaxLength(500)]
        public string? Notes { get; set; }

        public DateTime? ResolvedAt { get; set; }
    }
}
