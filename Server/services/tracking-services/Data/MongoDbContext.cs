namespace TrackingService.Data
{
    public class MongoDbContext
    {
        private readonly IMongoDatabase _database;

        public MongoDbContext(IConfiguration configuration)
        {
            var connectionString = configuration.GetConnectionString("MongoDB") ?? "mongodb://localhost:27017";
            var client = new MongoClient(connectionString);
            _database = client.GetDatabase("SupplyChainLogsDB");
        }

        public IMongoDatabase GetDatabase()
        {
            return _database;
        }

      
        public IMongoCollection<T> GetCollection<T>(string name)
        {
            return _database.GetCollection<T>(name);
        }
    }
}