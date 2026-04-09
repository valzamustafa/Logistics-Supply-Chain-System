using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Server.Models.Mongo
{
    public class PerformanceMetric
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }
        
        public string Endpoint { get; set; } = string.Empty;
        public string Method { get; set; } = string.Empty;
        public long ResponseTimeMs { get; set; }
        public int StatusCode { get; set; }
        public string? UserId { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}