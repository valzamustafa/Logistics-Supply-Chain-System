using AuthService.Models;

namespace AuthService.Repositories.Interfaces
{
    public interface IUserRoleRepository
    {
        Task<UserRole?> GetByUserAndRoleAsync(int userId, int roleId);
        Task<UserRole> CreateAsync(UserRole userRole);
        Task DeleteAsync(int id);
    }
}