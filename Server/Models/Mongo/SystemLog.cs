using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Server.Models.Mongo
{
    public class SystemLog
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }
        
        public string Level { get; set; } = "Info";
        public string Service { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public int? UserId { get; set; }
        public string? IpAddress { get; set; }
        public string? Endpoint { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}