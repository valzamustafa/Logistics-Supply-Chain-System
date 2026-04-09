using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Server.Models.Mongo
{
    public class ChatMessage
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }
        
        public int FromUserId { get; set; }
        public int ToUserId { get; set; }
        public string? RoomId { get; set; }
        public string Message { get; set; } = string.Empty;
        public bool IsRead { get; set; } = false;
        public DateTime SentAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReadAt { get; set; }
    }
}