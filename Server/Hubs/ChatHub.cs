using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Server.Data;
using Server.Models;
using System;
using System.Threading.Tasks;

namespace Server.Hubs
{
    // SignalR Hub для чата — сохраняет сообщения в БД и рассылает полный объект Message клиентам
    public class ChatHub : Hub
    {
        private readonly ILogger<ChatHub> _logger;
        private readonly AppDbContext _db;

        public ChatHub(ILogger<ChatHub> logger, AppDbContext db)
        {
            _logger = logger;
            _db = db;
        }

        public override async Task OnConnectedAsync()
        {
            _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            _logger.LogInformation("Client disconnected: {ConnectionId}, error: {Error}", Context.ConnectionId, exception?.Message);
            await base.OnDisconnectedAsync(exception);
        }

        // Принимает параметры: user, message, optional taskId
        // Сохраняет Message в БД и рассылает всем клиентам полный объект сообщения с Id
        public async Task SendMessage(string user, string message, int? taskId = null)
        {
            _logger.LogInformation("SendMessage from {User}: {Message}", user, message);

            var msg = new Message
            {
                User = user ?? "Unknown",
                Text = message ?? string.Empty,
                CreatedAt = DateTime.UtcNow,
                TaskId = taskId
            };

            _db.Messages.Add(msg);
            await _db.SaveChangesAsync();

            // Отправляем всем полную модель сообщения (сгенерированный Id и CreatedAt)
            await Clients.All.SendAsync("ReceiveMessage", msg);
        }
    }
}
