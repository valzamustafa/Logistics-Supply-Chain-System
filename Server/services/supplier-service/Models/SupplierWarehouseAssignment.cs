using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SupplierService.Models
{
    public class SupplierWarehouseAssignment : BaseEntity
    {
        [Required]
        public int SupplierId { get; set; }

        [Required]
        public int WarehouseId { get; set; }

        public bool IsActive { get; set; } = true;

        public int? AssignedByAdminId { get; set; }

        public DateTime AssignedDate { get; set; } = DateTime.UtcNow;

        public virtual Supplier? Supplier { get; set; }
    }
}
