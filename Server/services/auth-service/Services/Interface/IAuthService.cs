using AuthService.DTOs;
using AuthService.Models;

namespace AuthService.Services.Interfaces
{
    public interface IAuthService
    {
        // Auth
        Task<UserResponseDto> RegisterAsync(RegisterDto registerDto);
        Task<LoginResponseDto> LoginAsync(LoginDto loginDto);
        Task<TokenDto> RefreshTokenAsync(RefreshTokenRequestDto request);
        Task LogoutAsync(int userId, string refreshToken);
        
        // Users
        Task<IEnumerable<UserResponseDto>> GetAllUsersAsync();
        Task<UserResponseDto?> GetUserByIdAsync(int id);
        Task<UserDetailsDto?> GetUserDetailsByIdAsync(int id);
        Task<UserResponseDto> UpdateUserAsync(int id, UpdateUserDto updateDto);
        Task<bool> DeleteUserAsync(int id);
        
        // Roles
        Task<Role> CreateRoleAsync(CreateRoleDto createDto);
        Task<Role> UpdateRoleAsync(int id, UpdateRoleDto updateDto);
        Task<bool> DeleteRoleAsync(int id);
        Task<IEnumerable<Role>> GetAllRolesAsync();
        Task<Role?> GetRoleByIdAsync(int id);
        
        // User Roles
        Task AssignRoleAsync(int userId, int roleId);
        Task RemoveRoleAsync(int userId, int roleId);
        Task<IEnumerable<Role>> GetUserRolesAsync(int userId);
        
        // Permissions
        Task UpdateRolePermissionsAsync(int roleId, UpdateRolePermissionsDto permissionsDto);
        Task<IEnumerable<Permission>> GetAllPermissionsAsync();
        Task<bool> HasPermissionAsync(int userId, string permission);
    }
}