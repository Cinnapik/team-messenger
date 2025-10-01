using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using Server.Data;
using Server.Models;
using Server.Hubs;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MessagesController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IHubContext<ChatHub> _hub;

        public MessagesController(AppDbContext db, IHubContext<ChatHub> hub)
        {
            _db = db;
            _hub = hub;
        }

        // GET api/messages?chatId=general
        [HttpGet]
        public async Task<ActionResult<List<Message>>> Get(string? chatId = null, int limit = 500)
        {
            var q = _db.Messages.AsNoTracking().AsQueryable();
            if (!string.IsNullOrEmpty(chatId)) q = q.Where(m => m.ChatId == chatId);
            var list = await q.OrderBy(m => m.CreatedAt).Take(limit).ToListAsync();
            return Ok(list);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Message>> GetOne(int id)
        {
            var m = await _db.Messages.FindAsync(id);
            if (m == null) return NotFound();
            return Ok(m);
        }

        [HttpPatch("{id}")]
        public async Task<ActionResult> Patch(int id, [FromBody] EditDto dto)
        {
            var m = await _db.Messages.FindAsync(id);
            if (m == null) return NotFound();
            if (dto.Text != null) m.Text = dto.Text;
            if (dto.TaskId.HasValue) m.TaskId = dto.TaskId;
            await _db.SaveChangesAsync();

            // notify hub about updated message
            await _hub.Clients.All.SendAsync("MessageUpdated", m);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            var m = await _db.Messages.FindAsync(id);
            if (m == null) return NotFound();
            _db.Messages.Remove(m);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // PATCH api/messages/{id}/assignTask/{taskId}
        [HttpPatch("{id}/assignTask/{taskId}")]
        public async Task<ActionResult> AssignTask(int id, int taskId)
        {
            var m = await _db.Messages.FindAsync(id);
            if (m == null) return NotFound();
            var t = await _db.Tasks.FindAsync(taskId);
            if (t == null) return NotFound(new { error = "Task not found" });

            m.TaskId = taskId;
            await _db.SaveChangesAsync();

            // notify hub about message change
            await _hub.Clients.All.SendAsync("MessageUpdated", m);
            return NoContent();
        }

        public class EditDto
        {
            public string? Text { get; set; }
            public int? TaskId { get; set; }
        }
    }
}
