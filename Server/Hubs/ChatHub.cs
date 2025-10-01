using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Server.Data;
using Server.Models;
using System;
using System.Threading.Tasks;

namespace Server.Hubs
{
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

public async Task SendMessage(string user, string message, int? taskId = null)
{
    _logger.LogInformation("SendMessage from {User}: {Message}", user, message);

    var msg = new Message
    {
        User = user,
        Text = message,
        CreatedAt = DateTime.UtcNow,
        TaskId = taskId
    };

    _db.Messages.Add(msg);
    await _db.SaveChangesAsync();

    await Clients.All.SendAsync("ReceiveMessage", msg.User, msg.Text, msg.CreatedAt, msg.TaskId);
}
        
    }
}
