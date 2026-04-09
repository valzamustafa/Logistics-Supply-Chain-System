using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Server.Models.Mongo
{
    public class RealTimeEvent
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }
        
        public string EventType { get; set; } = string.Empty;
        public int UserId { get; set; }
        public string Data { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}