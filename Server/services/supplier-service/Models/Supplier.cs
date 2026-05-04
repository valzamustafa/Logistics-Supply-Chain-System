using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SupplierService.Models
{
    public class Supplier : BaseEntity
    {
        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? ContactPerson { get; set; }
        
        [MaxLength(100)]
        public string? Email { get; set; }
        
        [MaxLength(20)]
        public string? Phone { get; set; }
        
        [MaxLength(50)]
        public string? VatNumber { get; set; }
        
        [MaxLength(500)]
        public string? Address { get; set; }
        
        [MaxLength(100)]
        public string? PaymentTerms { get; set; }
        
        public decimal CreditLimit { get; set; }
        
        public bool IsApproved { get; set; } = true;
        
        public bool IsActive { get; set; } = true;
        
        public virtual ICollection<SupplierOrder> Orders { get; set; } = new List<SupplierOrder>();
        public virtual ICollection<SupplierProduct> Products { get; set; } = new List<SupplierProduct>();
    }
}