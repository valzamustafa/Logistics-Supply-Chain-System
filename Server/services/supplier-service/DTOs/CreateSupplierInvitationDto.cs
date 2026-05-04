namespace SupplierService.DTOs
{
    public class CreateSupplierInvitationDto
    {
        public string Email { get; set; } = string.Empty;
        public int WarehouseId { get; set; }
        public DateTime? ExpiresAt { get; set; }
    }
}
