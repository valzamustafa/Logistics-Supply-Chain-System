using System.ComponentModel.DataAnnotations;

namespace AuthService.DTOs
{
    public class RefreshTokenResponseDto
    {
        public string Token { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
    }
}
