using MongoDB.Driver;
using Server.Models.Mongo;

namespace Server.Data
{
    public class MongoDbContext
    {
        private readonly IMongoDatabase _database;

        public MongoDbContext(IConfiguration configuration)
        {
            var connectionString = configuration.GetConnectionString("MongoDB");
            var client = new MongoClient(connectionString);
            _database = client.GetDatabase("SupplyChainLogsDB");
        }

        // Metoda për të marrë databazën
        public IMongoDatabase GetDatabase()
        {
            return _database;
        }

        // Koleksionet për MongoDB
        public IMongoCollection<SystemLog> SystemLogs 
            => _database.GetCollection<SystemLog>("SystemLogs");
        
        public IMongoCollection<ChatMessage> ChatMessages 
            => _database.GetCollection<ChatMessage>("ChatMessages");
        
        public IMongoCollection<AuditTrail> AuditTrails 
            => _database.GetCollection<AuditTrail>("AuditTrails");
        
        public IMongoCollection<RealTimeEvent> RealTimeEvents 
            => _database.GetCollection<RealTimeEvent>("RealTimeEvents");
             public IMongoCollection<TrackingLog> TrackingLogs 
            => _database.GetCollection<TrackingLog>("TrackingLogs");
            public IMongoCollection<PerformanceMetric> PerformanceMetrics 
    => _database.GetCollection<PerformanceMetric>("PerformanceMetrics");
    }
}