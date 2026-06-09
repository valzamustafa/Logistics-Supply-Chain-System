using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SettingsService.DTOs;
using SettingsService.Services;
using BuildingBlocks;

namespace SettingsService.Controllers
{
    [ApiController]
    [Route("api/settings")]
    [Authorize]
    public class SettingsController : ControllerBase
    {
        private readonly ISettingService _settingService;
        private readonly INotificationClient _notificationClient;
        private readonly ILogger<SettingsController> _logger;

        public SettingsController(ISettingService settingService, INotificationClient notificationClient, ILogger<SettingsController> logger)
        {
            _settingService = settingService;
            _notificationClient = notificationClient;
            _logger = logger;
        }

      
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<SettingDto>>> GetAllSettings()
        {
            try
            {
                _logger.LogInformation("Fetching all settings");
                var settings = await _settingService.GetAllSettingsAsync();
                return Ok(settings);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching all settings");
                return StatusCode(500, new { message = "Error fetching settings", error = ex.Message });
            }
        }


        [HttpGet("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<SettingDto>> GetSettingById(int id)
        {
            try
            {
                _logger.LogInformation($"Fetching setting with id {id}");
                var setting = await _settingService.GetSettingByIdAsync(id);
                
                if (setting == null)
                {
                    return NotFound(new { message = $"Setting with id {id} not found" });
                }

                return Ok(setting);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error fetching setting with id {id}");
                return StatusCode(500, new { message = "Error fetching setting", error = ex.Message });
            }
        }


        [HttpGet("key/{key}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<SettingDto>> GetSettingByKey(string key)
        {
            try
            {
                _logger.LogInformation($"Fetching setting with key {key}");
                var setting = await _settingService.GetSettingByKeyAsync(key);
                
                if (setting == null)
                {
                    return NotFound(new { message = $"Setting with key '{key}' not found" });
                }

                return Ok(setting);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error fetching setting with key {key}");
                return StatusCode(500, new { message = "Error fetching setting", error = ex.Message });
            }
        }

     
        [HttpGet("system/config")]
        [AllowAnonymous]
        public async Task<ActionResult<SettingsResponseDto>> GetSystemSettings()
        {
            try
            {
                _logger.LogInformation("Fetching system settings");
                var settings = await _settingService.GetSystemSettingsAsync();
                return Ok(settings);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching system settings");
                return StatusCode(500, new { message = "Error fetching system settings", error = ex.Message });
            }
        }

    
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<SettingDto>> CreateSetting([FromBody] CreateSettingDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                _logger.LogInformation($"Creating setting with key {dto.Key}");
                var setting = await _settingService.CreateSettingAsync(dto);
                
               
                try
                {
                    await _notificationClient.SendNotificationToRoleAsync(
                        "Admin",
                        "info",
                        "New Setting Created",
                        $"New setting '{setting.Key}' has been created successfully.",
                        "/settings"
                    );
                }
                catch (Exception notificationEx)
                {
                    _logger.LogWarning(notificationEx, "Failed to send notification for setting creation");
                    
                }
                
                return CreatedAtAction(nameof(GetSettingById), new { id = setting.Id }, setting);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, $"Invalid operation creating setting");
                return Conflict(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating setting");
                return StatusCode(500, new { message = "Error creating setting", error = ex.Message });
            }
        }

    
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<SettingDto>> UpdateSetting(int id, [FromBody] UpdateSettingDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                _logger.LogInformation($"Updating setting with id {id}");
                var setting = await _settingService.UpdateSettingAsync(id, dto);
                
          
                try
                {
                    await _notificationClient.SendNotificationToRoleAsync(
                        "Admin",
                        "info",
                        "Settings Updated",
                        $"Setting '{setting.Key}' has been updated successfully.",
                        "/settings"
                    );
                }
                catch (Exception notificationEx)
                {
                    _logger.LogWarning(notificationEx, "Failed to send notification for setting update");
                    
                }
                
                return Ok(setting);
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, $"Setting not found");
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating setting");
                return StatusCode(500, new { message = "Error updating setting", error = ex.Message });
            }
        }

  
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> DeleteSetting(int id)
        {
            try
            {
                _logger.LogInformation($"Deleting setting with id {id}");
                
               
                var setting = await _settingService.GetSettingByIdAsync(id);
                if (setting == null)
                {
                    return NotFound(new { message = $"Setting with id {id} not found" });
                }
                
                await _settingService.DeleteSettingAsync(id);
                
              
                try
                {
                    await _notificationClient.SendNotificationToRoleAsync(
                        "Admin",
                        "info",
                        "Setting Deleted",
                        $"Setting '{setting.Key}' has been deleted successfully.",
                        "/settings"
                    );
                }
                catch (Exception notificationEx)
                {
                    _logger.LogWarning(notificationEx, "Failed to send notification for setting deletion");
                   
                }
                
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Setting not found");
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting setting");
                return StatusCode(500, new { message = "Error deleting setting", error = ex.Message });
            }
        }
    }
}
