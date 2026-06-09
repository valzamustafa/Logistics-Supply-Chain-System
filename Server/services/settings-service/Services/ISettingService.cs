using SettingsService.DTOs;

namespace SettingsService.Services
{
    public interface ISettingService
    {
        Task<List<SettingDto>> GetAllSettingsAsync();
        Task<SettingDto?> GetSettingByIdAsync(int id);
        Task<SettingDto?> GetSettingByKeyAsync(string key);
        Task<SettingDto> CreateSettingAsync(CreateSettingDto dto);
        Task<SettingDto> UpdateSettingAsync(int id, UpdateSettingDto dto);
        Task<bool> DeleteSettingAsync(int id);
        Task<SettingsResponseDto> GetSystemSettingsAsync();
    }
}
