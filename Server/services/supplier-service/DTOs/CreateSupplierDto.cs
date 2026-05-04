namespace SupplierService.DTOs
{
    public class CreateSupplierDto
    {
        public string Name { get; set; } = string.Empty;
        public string? ContactPerson { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? VatNumber { get; set; }
        public string? Address { get; set; }
        public string? PaymentTerms { get; set; }
        public decimal? CreditLimit { get; set; }
        public bool IsApproved { get; set; } = true;
    }
}