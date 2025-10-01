using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Server.Data;
using Server.Models;
using Server.Hubs;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TasksController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IHubContext<ChatHub> _hub;
        private readonly ILogger<TasksController> _logger;

        public TasksController(AppDbContext db, IHubContext<ChatHub> hub, ILogger<TasksController> logger)
        {
            _db = db;
            _hub = hub;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            try
            {
                if (_db.Tasks == null) return Ok(Array.Empty<object>());
                var items = await _db.Tasks.AsNoTracking().OrderByDescending(t => t.CreatedAt).ToListAsync();
                return Ok(items);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GET /api/tasks failed");
                return StatusCode(500, new { error = "Failed to load tasks", detail = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TaskCreateDto dto)
        {
            if (dto == null) return BadRequest(new { error = "Empty payload" });

            try
            {
                if (_db.Tasks == null)
                {
                    _logger.LogError("DbContext.Tasks is null");
                    return StatusCode(500, new { error = "Server DB error", detail = "Tasks DbSet is not available" });
                }

                var t = new TaskItem
                {
                    Title = dto.Title ?? string.Empty,
                    Description = dto.Description,
                    Status = string.IsNullOrWhiteSpace(dto.Status) ? "todo" : dto.Status,
                    CreatedAt = DateTime.UtcNow,
                    Progress = dto.Progress ?? 0
                };

                _db.Tasks.Add(t);
                await _db.SaveChangesAsync();

                var tasks = await _db.Tasks.AsNoTracking().ToListAsync();
                await _hub.Clients.All.SendAsync("TasksUpdated", tasks);

                return CreatedAtAction(nameof(Get), new { id = t.Id }, t);
            }
            catch (DbUpdateException dbex)
            {
                _logger.LogError(dbex, "DB update error during task creation. Payload: {@dto}", dto);
                return StatusCode(500, new { error = "Database update failed", detail = dbex.InnerException?.Message ?? dbex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "POST /api/tasks failed. Payload: {@dto}", dto);
                return StatusCode(500, new { error = "Failed to create task", detail = ex.Message });
            }
        }

        [HttpGet("{id}/messages")]
        public async Task<IActionResult> GetMessagesForTask(int id)
        {
            try
            {
                var msgs = await _db.Messages.AsNoTracking().Where(m => m.TaskId == id).OrderBy(m => m.CreatedAt).ToListAsync();
                return Ok(msgs);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GET /api/tasks/{Id}/messages failed", id);
                return StatusCode(500, new { error = "Failed to load messages for task", detail = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] TaskItem updated)
        {
            if (updated == null) return BadRequest(new { error = "Empty payload" });

            try
            {
                var t = await _db.Tasks.FindAsync(id);
                if (t == null) return NotFound();

                if (!string.IsNullOrWhiteSpace(updated.Title)) t.Title = updated.Title;
                t.Description = updated.Description;
                t.Status = updated.Status ?? t.Status;
                t.Progress = updated.Progress;
                t.UpdatedAt = DateTime.UtcNow;

                await _db.SaveChangesAsync();

                var tasks = await _db.Tasks.AsNoTracking().ToListAsync();
                await _hub.Clients.All.SendAsync("TasksUpdated", tasks);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PUT /api/tasks/{Id} failed", id);
                return StatusCode(500, new { error = "Failed to update task", detail = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var t = await _db.Tasks.FindAsync(id);
                if (t == null) return NotFound();

                _db.Tasks.Remove(t);
                await _db.SaveChangesAsync();

                var msgs = await _db.Messages.Where(m => m.TaskId == id).ToListAsync();
                foreach (var m in msgs) m.TaskId = null;
                if (msgs.Count > 0) await _db.SaveChangesAsync();

                var tasks = await _db.Tasks.AsNoTracking().ToListAsync();
                await _hub.Clients.All.SendAsync("TasksUpdated", tasks);
                foreach (var m in msgs) await _hub.Clients.All.SendAsync("MessageUpdated", m);

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DELETE /api/tasks/{Id} failed", id);
                return StatusCode(500, new { error = "Failed to delete task", detail = ex.Message });
            }
        }

        public class TaskCreateDto
        {
            public string? Title { get; set; }
            public string? Description { get; set; }
            public string? Status { get; set; }
            public int? Progress { get; set; }
        }
    }
}
