using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Server.Controllers
{
    // Контроллер для работы с сообщениями (история, привязка к задаче)
    [ApiController]
    [Route("api/[controller]")]
    public class MessagesController : ControllerBase
    {
        private readonly AppDbContext _db;
        public MessagesController(AppDbContext db) => _db = db;

        // GET api/messages?limit=100
        // Возвращает историю сообщений (по умолчанию последние 100)
        [HttpGet]
        public async Task<ActionResult<List<Message>>> GetHistory(int limit = 100)
        {
            var messages = await _db.Messages
                .AsNoTracking()
                .OrderByDescending(m => m.CreatedAt)
                .Take(limit)
                .ToListAsync();

            messages.Reverse(); // возвращаем в хронологическом порядке
            return Ok(messages);
        }

        // GET api/messages/{id}
        // Возвращает одно сообщение по id
        [HttpGet("{id}")]
        public async Task<ActionResult<Message>> Get(int id)
        {
            var msg = await _db.Messages.FindAsync(id);
            if (msg == null) return NotFound();
            return Ok(msg);
        }

        // PATCH api/messages/{messageId}/assignTask/{taskId}
        // Привязать сообщение к задаче (устанавливает TaskId у сообщения)
        [HttpPatch("{messageId}/assignTask/{taskId}")]
        public async Task<ActionResult> AssignTask(int messageId, int taskId)
        {
            var msg = await _db.Messages.FindAsync(messageId);
            if (msg == null) return NotFound();
            var task = await _db.Tasks.FindAsync(taskId);
            if (task == null) return NotFound();
            msg.TaskId = taskId;
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // DELETE api/messages/{id}
        // Удаляет сообщение (удаляет запись из БД)
        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            var msg = await _db.Messages.FindAsync(id);
            if (msg == null) return NotFound();
            _db.Messages.Remove(msg);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
