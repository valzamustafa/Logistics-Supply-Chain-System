namespace SupplierService.DTOs
{
    public class SupplierInvitationDto
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public int WarehouseId { get; set; }
        public string Token { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime? ExpiresAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
