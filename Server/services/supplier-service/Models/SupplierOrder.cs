using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SupplierService.Models
{
    public class SupplierOrder : BaseEntity
    {
        [Required]
        public int SupplierId { get; set; }
        
        [Required, MaxLength(50)]
        public string OrderNumber { get; set; } = string.Empty;
        
        public DateTime OrderDate { get; set; } = DateTime.UtcNow;
        
        [Required]
        public decimal TotalAmount { get; set; }
        
        [MaxLength(50)]
        public string Status { get; set; } = "Pending";
        
        public virtual Supplier Supplier { get; set; } = null!;
        public virtual ICollection<SupplierOrderItem> Items { get; set; } = new List<SupplierOrderItem>();
    }
}