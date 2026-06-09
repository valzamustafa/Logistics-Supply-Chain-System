using SettingsService.DTOs;
using SettingsService.Models;
using SettingsService.Repositories;

namespace SettingsService.Services
{
    public class SettingService : ISettingService
    {
        private readonly ISettingRepository _repository;

        public SettingService(ISettingRepository repository)
        {
            _repository = repository;
        }

        public async Task<List<SettingDto>> GetAllSettingsAsync()
        {
            var settings = await _repository.GetAllAsync();
            return settings.Select(s => MapToDto(s)).ToList();
        }

        public async Task<SettingDto?> GetSettingByIdAsync(int id)
        {
            var setting = await _repository.GetByIdAsync(id);
            return setting != null ? MapToDto(setting) : null;
        }

        public async Task<SettingDto?> GetSettingByKeyAsync(string key)
        {
            var setting = await _repository.GetByKeyAsync(key);
            return setting != null ? MapToDto(setting) : null;
        }

        public async Task<SettingDto> CreateSettingAsync(CreateSettingDto dto)
        {

            var existing = await _repository.GetByKeyAsync(dto.Key);
            if (existing != null)
            {
                throw new InvalidOperationException($"Setting with key '{dto.Key}' already exists.");
            }

            var setting = new Setting
            {
                Key = dto.Key,
                Value = dto.Value,
                Description = dto.Description
            };

            var created = await _repository.CreateAsync(setting);
            return MapToDto(created);
        }

        public async Task<SettingDto> UpdateSettingAsync(int id, UpdateSettingDto dto)
        {
            var setting = await _repository.GetByIdAsync(id);
            if (setting == null)
            {
                throw new KeyNotFoundException($"Setting with id {id} not found.");
            }

            setting.Value = dto.Value;
            setting.Description = dto.Description;

            var updated = await _repository.UpdateAsync(setting);
            return MapToDto(updated);
        }

        public async Task<bool> DeleteSettingAsync(int id)
        {
            var setting = await _repository.GetByIdAsync(id);
            if (setting == null)
            {
                throw new KeyNotFoundException($"Setting with id {id} not found.");
            }

            await _repository.DeleteAsync(id);
            return true;
        }

        public async Task<SettingsResponseDto> GetSystemSettingsAsync()
        {
            var settings = await _repository.GetAllAsync();
            var settingDict = settings.ToDictionary(s => s.Key, s => s.Value);

            return new SettingsResponseDto
            {
                CompanyName = settingDict.ContainsKey("CompanyName") ? settingDict["CompanyName"] : "Logjistika",
                CompanyEmail = settingDict.ContainsKey("CompanyEmail") ? settingDict["CompanyEmail"] : "info@logjistika.com",
                CompanyPhone = settingDict.ContainsKey("CompanyPhone") ? settingDict["CompanyPhone"] : "+1-800-000-0000",
                CompanyAddress = settingDict.ContainsKey("CompanyAddress") ? settingDict["CompanyAddress"] : "123 Business St, Suite 100, City, State 12345",
                SystemLanguage = settingDict.ContainsKey("SystemLanguage") ? settingDict["SystemLanguage"] : "en"
            };
        }

        private static SettingDto MapToDto(Setting setting)
        {
            return new SettingDto
            {
                Id = setting.Id,
                Key = setting.Key,
                Value = setting.Value,
                Description = setting.Description,
                UpdatedAt = setting.UpdatedAt
            };
        }
    }
}
