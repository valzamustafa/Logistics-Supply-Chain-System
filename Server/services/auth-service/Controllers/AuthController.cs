using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AuthService.DTOs;
using AuthService.Services.Interfaces;
using BuildingBlocks;

namespace AuthService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly INotificationClient _notificationClient;

        public AuthController(IAuthService authService, INotificationClient notificationClient)
        {
            _authService = authService;
            _notificationClient = notificationClient;
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterDto registerDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var user = await _authService.RegisterAsync(registerDto);
                return Ok(new { message = "User registered successfully", user });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
        {
            try
            {
                var response = await _authService.LoginAsync(loginDto);
                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }

        [HttpPost("refresh")]
        [AllowAnonymous]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequestDto request)
        {
            try
            {
                var response = await _authService.RefreshTokenAsync(request);
                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout([FromBody] RefreshTokenRequestDto request)
        {
            var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");
            await _authService.LogoutAsync(userId, request.RefreshToken);
            return Ok(new { message = "Logged out successfully" });
        }

        [HttpGet("users")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _authService.GetAllUsersAsync();
            return Ok(users);
        }

        [HttpGet("users/{id}")]
        [Authorize]
        public async Task<IActionResult> GetUserById(int id)
        {
            var user = await _authService.GetUserByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "User not found" });
            return Ok(user);
        }

        [HttpGet("users/{id}/details")]
        [Authorize]
        public async Task<IActionResult> GetUserDetailsById(int id)
        {
            var user = await _authService.GetUserDetailsByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "User not found" });
            return Ok(user);
        }

        [HttpPut("users/{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserDto updateDto)
        {
            try
            {
                var user = await _authService.UpdateUserAsync(id, updateDto);
                return Ok(user);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpDelete("users/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var deleted = await _authService.DeleteUserAsync(id);
            if (!deleted)
                return NotFound(new { message = "User not found" });
            return NoContent();
        }

        [HttpPost("roles")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateRole([FromBody] CreateRoleDto createDto)
        {
            try
            {
                var role = await _authService.CreateRoleAsync(createDto);
                return Ok(role);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("roles/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateRoleDto updateDto)
        {
            try
            {
                var role = await _authService.UpdateRoleAsync(id, updateDto);
                return Ok(role);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpDelete("roles/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteRole(int id)
        {
            var deleted = await _authService.DeleteRoleAsync(id);
            if (!deleted)
                return NotFound(new { message = "Role not found" });
            return NoContent();
        }

        [HttpGet("roles")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllRoles()
        {
            var roles = await _authService.GetAllRolesAsync();
            return Ok(roles);
        }

        [HttpPost("users/{userId}/roles/{roleId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AssignRole(int userId, int roleId)
        {
            try
            {
                await _authService.AssignRoleAsync(userId, roleId);
                return Ok(new { message = "Role assigned successfully" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("users/{userId}/roles/{roleId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RemoveRole(int userId, int roleId)
        {
            await _authService.RemoveRoleAsync(userId, roleId);
            return Ok(new { message = "Role removed successfully" });
        }

        [HttpGet("users/{userId}/roles")]
        [Authorize]
        public async Task<IActionResult> GetUserRoles(int userId)
        {
            var roles = await _authService.GetUserRolesAsync(userId);
            return Ok(roles);
        }

        [HttpPut("roles/{roleId}/permissions")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateRolePermissions(int roleId, [FromBody] UpdateRolePermissionsDto permissionsDto)
        {
            await _authService.UpdateRolePermissionsAsync(roleId, permissionsDto);
            return Ok(new { message = "Permissions updated successfully" });
        }

        [HttpGet("permissions")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllPermissions()
        {
            var permissions = await _authService.GetAllPermissionsAsync();
            return Ok(permissions);
        }

        [HttpGet("users/{userId}/has-permission/{permission}")]
        [Authorize]
        public async Task<IActionResult> HasPermission(int userId, string permission)
        {
            var hasPermission = await _authService.HasPermissionAsync(userId, permission);
            return Ok(new { hasPermission });
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");
            if (userId == 0)
                return Unauthorized();

            var user = await _authService.GetUserDetailsByIdAsync(userId);
            return Ok(user);
        }
    }
}