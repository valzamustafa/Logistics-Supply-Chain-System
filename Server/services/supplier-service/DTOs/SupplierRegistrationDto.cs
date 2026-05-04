namespace SupplierService.DTOs
{
    public class SupplierRegistrationDto
    {
        public string Name { get; set; } = string.Empty;
        public string? ContactPerson { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string Token { get; set; } = string.Empty;
    }
}
