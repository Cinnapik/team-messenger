using Microsoft.EntityFrameworkCore;
using Server.Models;

namespace Server.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> opts) : base(opts) { }

        public DbSet<Message> Messages { get; set; }
        public DbSet<TaskItem> Tasks { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Message>().Property(m => m.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            modelBuilder.Entity<TaskItem>().Property(t => t.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        }
    }
}
