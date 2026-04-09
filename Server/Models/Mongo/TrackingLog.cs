using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Server.Models.Mongo
{
    public class TrackingLog
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }
        
        public int ShipmentId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Location { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public string? Description { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}