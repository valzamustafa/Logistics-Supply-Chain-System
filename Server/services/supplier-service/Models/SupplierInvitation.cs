using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SupplierService.Models
{
    public class SupplierInvitation : BaseEntity
    {
        [Required, MaxLength(100)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public int WarehouseId { get; set; }

        [Required, MaxLength(255)]
        public string Token { get; set; } = string.Empty;

        [Required, MaxLength(50)]
        public string Status { get; set; } = "Pending";

        public DateTime? ExpiresAt { get; set; }

        public virtual Supplier? Supplier { get; set; }
    }
}
