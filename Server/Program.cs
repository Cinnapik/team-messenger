using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;
using System.Text.Json;
using Server.Data;
using Server.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddFilter("Microsoft.EntityFrameworkCore.Database.Command", LogLevel.Information);

// CORS for dev
var devCors = "DevCors";
builder.Services.AddCors(options =>
{
    options.AddPolicy(devCors, policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Controllers and SignalR
builder.Services.AddControllers();
builder.Services.AddSignalR().AddHubOptions<ChatHub>(opts => opts.EnableDetailedErrors = true);

// DbContext: try configured connection; fallback to local SQLite dev DB
var conn = builder.Configuration.GetConnectionString("DefaultConnection");
if (!string.IsNullOrWhiteSpace(conn) && conn.Contains("Data Source="))
{
    builder.Services.AddDbContext<AppDbContext>(opt => opt.UseSqlite(conn));
}
else
{
    builder.Services.AddDbContext<AppDbContext>(opt => opt.UseSqlite("Data Source=dev_app.db"));
}

var app = builder.Build();

// Global JSON exception handler for API
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("GlobalException");
        logger.LogError(ex, "Unhandled exception while processing request {Method} {Path}", context.Request.Method, context.Request.Path);

        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        var payload = JsonSerializer.Serialize(new { error = "Internal Server Error", detail = ex.Message });
        await context.Response.WriteAsync(payload);
    }
});

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

app.UseRouting();
app.UseCors(devCors);
app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");

// Ensure database exists and patch schema (dev convenience)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    try
    {
        var connDb = db.Database.GetDbConnection();
        connDb.Open();

        try
        {
            using var cmd = connDb.CreateCommand();
            cmd.CommandText = "ALTER TABLE Tasks ADD COLUMN Progress INTEGER DEFAULT 0";
            cmd.ExecuteNonQuery();
        }
        catch (Exception ex) { var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Startup"); logger.LogDebug("Add column Progress: {0}", ex.Message); }

        try
        {
            using var cmd = connDb.CreateCommand();
            cmd.CommandText = "ALTER TABLE Tasks ADD COLUMN UpdatedAt TEXT NULL";
            cmd.ExecuteNonQuery();
        }
        catch (Exception ex) { var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Startup"); logger.LogDebug("Add column UpdatedAt: {0}", ex.Message); }

        connDb.Close();
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
        logger.LogError(ex, "Failed to ensure DB columns");
    }
}

app.Run();
