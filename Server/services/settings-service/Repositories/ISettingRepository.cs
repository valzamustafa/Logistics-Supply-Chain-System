using SettingsService.Models;

namespace SettingsService.Repositories
{
    public interface ISettingRepository
    {
        Task<List<Setting>> GetAllAsync();
        Task<Setting?> GetByIdAsync(int id);
        Task<Setting?> GetByKeyAsync(string key);
        Task<Setting> CreateAsync(Setting setting);
        Task<Setting> UpdateAsync(Setting setting);
        Task DeleteAsync(int id);
        Task<bool> KeyExistsAsync(string key);
    }
}
