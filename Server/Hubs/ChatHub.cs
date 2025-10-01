using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
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
            _logger.LogInformation("Connected: {Id}", Context.ConnectionId);
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? ex)
        {
            _logger.LogInformation("Disconnected: {Id} ({Err})", Context.ConnectionId, ex?.Message);
            await base.OnDisconnectedAsync(ex);
        }

        public async Task SendMessage(string user, string message, int? taskId = null, string? chatId = null)
        {
            try
            {
                var msg = new Message
                {
                    User = user ?? "Unknown",
                    Text = message ?? string.Empty,
                    CreatedAt = DateTime.UtcNow,
                    TaskId = taskId,
                    ChatId = chatId
                };

                _db.Messages.Add(msg);
                await _db.SaveChangesAsync();

                await Clients.All.SendAsync("ReceiveMessage", msg);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SendMessage failed");
                throw;
            }
        }

        public async Task NotifyTasksUpdated()
        {
            var tasks = await _db.Tasks.AsNoTracking().ToListAsync();
            await Clients.All.SendAsync("TasksUpdated", tasks);
        }

        public async Task NotifyMessageUpdated(int messageId)
        {
            var msg = await _db.Messages.AsNoTracking().FirstOrDefaultAsync(m => m.Id == messageId);
            if (msg != null) await Clients.All.SendAsync("MessageUpdated", msg);
        }
    }
}
