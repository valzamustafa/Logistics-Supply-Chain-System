using Microsoft.AspNetCore.Mvc;
using NotificationService.DTOs;
using NotificationService.Services.Interfaces;

namespace NotificationService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly IChatService _chatService;

        public ChatController(IChatService chatService)
        {
            _chatService = chatService;
        }

        [HttpGet("conversation/{userA}/{userB}")]
        public async Task<IActionResult> GetConversation(int userA, int userB)
        {
            var conv = await _chatService.GetConversationAsync(userA, userB);
            return Ok(conv);
        }

        [HttpGet("unread-count/{userId}")]
        public async Task<IActionResult> GetUnreadCount(int userId)
        {
            var count = await _chatService.GetUnreadCountAsync(userId);
            return Ok(count);
        }

        [HttpGet("conversations/{userId}")]
        public async Task<IActionResult> GetConversations(int userId)
        {
            var conversations = await _chatService.GetConversationsAsync(userId);
            return Ok(conversations);
        }

        [HttpPost("send")]
        public async Task<IActionResult> Send([FromBody] SendChatDto dto)
        {
            var msg = await _chatService.SendMessageAsync(dto.SenderId, dto.RecipientId, dto.Message);
            return Ok(msg);
        }

        [HttpPost("mark-read/{userId}/{otherUserId}")]
        public async Task<IActionResult> MarkRead(int userId, int otherUserId)
        {
            var updated = await _chatService.MarkConversationReadAsync(userId, otherUserId);
            return Ok(new { updated });
        }
    }
}