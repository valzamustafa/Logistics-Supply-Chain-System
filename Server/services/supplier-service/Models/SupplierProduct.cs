using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;


namespace SupplierService.Models
{
    public class SupplierProduct : BaseEntity
    {
        [Required]
        public int SupplierId { get; set; }
        
        [Required]
        public int ProductId { get; set; }
        
        [MaxLength(50)]
        public string? SupplierSKU { get; set; }
        
        public decimal? LeadTimeDays { get; set; }
        
        public virtual Supplier Supplier { get; set; } = null!;
    }
}