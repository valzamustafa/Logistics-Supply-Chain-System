using System.ComponentModel.DataAnnotations;

namespace SupplierService.DTOs
{
    public class CreateSupplierProductDto
    {
        [Required]
        public int ProductId { get; set; }

        [MaxLength(50)]
        public string? SupplierSKU { get; set; }

        public decimal? LeadTimeDays { get; set; }
    }
}
